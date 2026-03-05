import WidgetKit
import SwiftUI
import LiveActivitiesKit

@main
struct LiveActivitiesExtensionBundle: WidgetBundle {
    var body: some Widget {
        MeoNoteWidget()
        DynamicActivityWidget()
    }
}
