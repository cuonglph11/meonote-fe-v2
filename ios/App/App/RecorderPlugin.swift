import Capacitor
import AVFoundation

@objc(RecorderPlugin)
public class RecorderPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RecorderPlugin"
    public let jsName = "Recorder"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hasAudioRecordingPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAudioRecordingPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pauseRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resumeRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCurrentStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getLastRecording", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cleanupOrphanedRecording", returnType: CAPPluginReturnPromise)
    ]

    // Recording state
    private var audioRecorder: AVAudioRecorder?
    private var recordingState: RecordingState = .idle
    private var currentFileURL: URL?
    private var recordingStartTime: Date?
    private var interruptionObserver: NSObjectProtocol?

    private enum RecordingState {
        case idle
        case recording
        case paused
    }

    private let LAST_RECORDING_KEY = "recorder_last_file"

    override public func load() {
        super.load()
        setupInterruptionObserver()
    }

    deinit {
        if let observer = interruptionObserver {
            NotificationCenter.default.removeObserver(observer)
        }
    }

    // MARK: - Permission Methods

    @objc func requestPermission(_ call: CAPPluginCall) {
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            DispatchQueue.main.async {
                call.resolve(["value": granted])
            }
        }
    }

    @objc func hasAudioRecordingPermission(_ call: CAPPluginCall) {
        let status = AVAudioSession.sharedInstance().recordPermission
        let granted = status == .granted
        call.resolve(["value": granted])
    }

    @objc func requestAudioRecordingPermission(_ call: CAPPluginCall) {
        AVAudioSession.sharedInstance().requestRecordPermission { granted in
            DispatchQueue.main.async {
                call.resolve(["value": granted])
            }
        }
    }

    // MARK: - Recording Control Methods

    @objc func startRecording(_ call: CAPPluginCall) {
        if recordingState != .idle {
            call.reject("Recording already in progress")
            return
        }

        let directory = call.getString("directory") ?? "DATA"
        let subDirectory = call.getString("subDirectory") ?? "recordings"
        let filename = call.getString("filename") ?? "recording.wav"

        do {
            try setupAudioSession()
        } catch {
            call.reject("Failed to setup audio session: \(error.localizedDescription)")
            return
        }

        guard let fileURL = getFileURL(directory: directory, subDirectory: subDirectory, filename: filename) else {
            call.reject("Failed to create file URL")
            return
        }

        let fileManager = FileManager.default
        if let directoryURL = fileURL.deletingLastPathComponent() as URL? {
            try? fileManager.createDirectory(at: directoryURL, withIntermediateDirectories: true, attributes: nil)
        }

        let settings: [String: Any] = [
            AVFormatIDKey: Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey: 44100.0,
            AVNumberOfChannelsKey: 1,
            AVEncoderAudioQualityKey: AVAudioQuality.medium.rawValue
        ]

        do {
            audioRecorder = try AVAudioRecorder(url: fileURL, settings: settings)
            audioRecorder?.delegate = self
            audioRecorder?.isMeteringEnabled = false

            if audioRecorder?.record() == true {
                recordingState = .recording
                currentFileURL = fileURL
                recordingStartTime = Date()

                persistLastRecording(fileURL: fileURL)

                call.resolve(["value": ["started": true]])
            } else {
                call.reject("Failed to start recording")
            }
        } catch {
            call.reject("Failed to create recorder: \(error.localizedDescription)")
        }
    }

    @objc func stopRecording(_ call: CAPPluginCall) {
        print("[RecorderPlugin] stopRecording called, state: \(recordingState)")

        guard let recorder = audioRecorder, recordingState != .idle else {
            print("[RecorderPlugin] stopRecording rejected: No recording in progress")
            call.reject("No recording in progress")
            return
        }

        // Read currentTime before stop() — it resets to 0 after stopping
        let duration = recorder.currentTime * 1000
        print("[RecorderPlugin] Duration from recorder.currentTime: \(Int(duration))ms")

        recorder.stop()
        print("[RecorderPlugin] Recorder stopped")

        var path: String? = nil
        if let fileURL = currentFileURL {
            print("[RecorderPlugin] currentFileURL: \(fileURL)")
            path = getRelativePath(from: fileURL)
            print("[RecorderPlugin] Relative path: \(path ?? "nil")")
        } else {
            print("[RecorderPlugin] currentFileURL is nil")
        }

        recordingState = .idle
        audioRecorder = nil
        currentFileURL = nil
        recordingStartTime = nil

        UserDefaults.standard.removeObject(forKey: LAST_RECORDING_KEY)

        var result: [String: Any] = [
            "mimeType": "audio/mp4",
            "msDuration": Int(duration)
        ]

        if let path = path {
            result["path"] = path
        }

        print("[RecorderPlugin] Resolving with result: \(result)")
        call.resolve(["value": result])
    }

    @objc func pauseRecording(_ call: CAPPluginCall) {
        guard let recorder = audioRecorder, recordingState == .recording else {
            call.reject("Not recording")
            return
        }

        recorder.pause()
        recordingState = .paused
        call.resolve(["paused": true])
    }

    @objc func resumeRecording(_ call: CAPPluginCall) {
        guard let recorder = audioRecorder, recordingState == .paused else {
            call.reject("Not paused")
            return
        }

        do {
            try setupAudioSession()
        } catch {
            call.reject("Failed to setup audio session: \(error.localizedDescription)")
            return
        }

        if recorder.record() {
            recordingState = .recording
            call.resolve(["recording": true])
        } else {
            call.reject("Failed to resume recording")
        }
    }

    @objc func getCurrentStatus(_ call: CAPPluginCall) {
        let status: String
        switch recordingState {
        case .recording:
            status = "RECORDING"
        case .paused:
            status = "PAUSED"
        case .idle:
            status = "NONE"
        }
        call.resolve(["status": status])
    }

    @objc func getLastRecording(_ call: CAPPluginCall) {
        if let lastPath = UserDefaults.standard.string(forKey: LAST_RECORDING_KEY) {
            let fileManager = FileManager.default
            let fileURL = getDocumentsURL().appendingPathComponent(lastPath)

            if fileManager.fileExists(atPath: fileURL.path) {
                call.resolve(["filePath": lastPath, "exists": true])
            } else {
                call.resolve(["exists": false])
            }
        } else {
            call.resolve(["exists": false])
        }
    }

    @objc func cleanupOrphanedRecording(_ call: CAPPluginCall) {
        guard let lastPath = UserDefaults.standard.string(forKey: LAST_RECORDING_KEY) else {
            call.resolve(["hadOrphan": false])
            return
        }

        if recordingState != .idle {
            call.resolve(["hadOrphan": false])
            return
        }

        let fileURL = getDocumentsURL().appendingPathComponent(lastPath)
        let fileManager = FileManager.default

        if fileManager.fileExists(atPath: fileURL.path) {
            do {
                try fileManager.removeItem(at: fileURL)
                UserDefaults.standard.removeObject(forKey: LAST_RECORDING_KEY)
                print("[RecorderPlugin] Cleaned up orphaned recording: \(lastPath)")
                call.resolve(["hadOrphan": true, "deletedPath": lastPath])
            } catch {
                print("[RecorderPlugin] Failed to delete orphaned file: \(error.localizedDescription)")
                call.resolve(["hadOrphan": false])
            }
        } else {
            UserDefaults.standard.removeObject(forKey: LAST_RECORDING_KEY)
            call.resolve(["hadOrphan": false])
        }
    }

    // MARK: - App Lifecycle Methods

    @objc public func finalizeActiveRecording() {
        guard let recorder = audioRecorder, recordingState != .idle else {
            print("[RecorderPlugin] finalizeActiveRecording: No active recording to finalize")
            return
        }

        print("[RecorderPlugin] Finalizing recording due to app entering background")

        recorder.stop()

        recordingState = .idle
        audioRecorder = nil
        currentFileURL = nil
        recordingStartTime = nil

        print("[RecorderPlugin] Recording finalized successfully")
    }

    // MARK: - Helper Methods

    private func setupAudioSession() throws {
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
        try audioSession.setActive(true)
    }

    private func getFileURL(directory: String, subDirectory: String, filename: String) -> URL? {
        let baseURL: URL

        switch directory.uppercased() {
        case "DATA", "DOCUMENTS":
            baseURL = getDocumentsURL()
        case "CACHE":
            baseURL = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        default:
            baseURL = getDocumentsURL()
        }

        if subDirectory.isEmpty {
            return baseURL.appendingPathComponent(filename)
        } else {
            return baseURL.appendingPathComponent(subDirectory).appendingPathComponent(filename)
        }
    }

    private func getDocumentsURL() -> URL {
        return FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }

    private func getRelativePath(from url: URL) -> String {
        let documentsURL = getDocumentsURL()
        if url.path.hasPrefix(documentsURL.path) {
            let relativePath = String(url.path.dropFirst(documentsURL.path.count + 1))
            return relativePath
        }
        return url.lastPathComponent
    }

    private func persistLastRecording(fileURL: URL) {
        let relativePath = getRelativePath(from: fileURL)
        UserDefaults.standard.set(relativePath, forKey: LAST_RECORDING_KEY)
    }

    private func setupInterruptionObserver() {
        interruptionObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            self?.handleInterruption(notification: notification)
        }
    }

    private func handleInterruption(notification: Notification) {
        guard let userInfo = notification.userInfo,
              let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }

        switch type {
        case .began:
            if recordingState == .recording, let recorder = audioRecorder {
                recorder.pause()
                recordingState = .paused
                print("[RecorderPlugin] Recording paused due to interruption")
            }

        case .ended:
            if let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt {
                let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
                if options.contains(.shouldResume) && recordingState == .paused {
                    do {
                        try setupAudioSession()
                        if let recorder = audioRecorder, recorder.record() {
                            recordingState = .recording
                            print("[RecorderPlugin] Recording resumed after interruption")
                        }
                    } catch {
                        print("[RecorderPlugin] Failed to resume after interruption: \(error)")
                    }
                }
            }

        @unknown default:
            break
        }
    }
}

// MARK: - AVAudioRecorderDelegate

extension RecorderPlugin: AVAudioRecorderDelegate {
    public func audioRecorderDidFinishRecording(_ recorder: AVAudioRecorder, successfully flag: Bool) {
        if !flag {
            print("[RecorderPlugin] Recording finished unsuccessfully")
            recordingState = .idle
            audioRecorder = nil
            currentFileURL = nil
            recordingStartTime = nil
        }
    }

    public func audioRecorderEncodeErrorDidOccur(_ recorder: AVAudioRecorder, error: Error?) {
        if let error = error {
            print("[RecorderPlugin] Encoding error: \(error.localizedDescription)")
        }
        recordingState = .idle
        audioRecorder = nil
        currentFileURL = nil
        recordingStartTime = nil
    }
}
