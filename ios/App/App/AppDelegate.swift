import UIKit
import Capacitor
import ActivityKit
import os.log
import LiveActivitiesKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // End any orphaned Live Activities from a previous session (force-kill recovery)
        LiveActivityCleanup.endAllActivities()
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Let recording continue in background
        // AVAudioRecorder writes audio data to disk continuously
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Attempt to end Live Activities on termination (best-effort; may not complete on force-kill)
        LiveActivityCleanup.endAllActivities()
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

// MARK: - Live Activity Cleanup Helper
enum LiveActivityCleanup {
    private static let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "MeoNote", category: "LiveActivityCleanup")

    static func endAllActivities() {
        guard #available(iOS 16.2, *) else {
            return
        }

        let activities = Activity<DynamicActivityAttributes>.activities
        logger.info("Ending \(activities.count) orphaned Live Activities on launch/terminate")

        for activity in activities {
            Task.detached(priority: .userInitiated) {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }
    }
}
