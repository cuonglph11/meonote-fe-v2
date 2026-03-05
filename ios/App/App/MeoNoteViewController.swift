import UIKit
import Capacitor

class MeoNoteViewController: CAPBridgeViewController {

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(RecorderPlugin())
        bridge?.registerPluginInstance(KeychainPlugin())
    }
}
