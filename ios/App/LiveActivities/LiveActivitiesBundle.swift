import WidgetKit
import SwiftUI
import LiveActivitiesKit

@main
struct LiveActivitiesBundle: WidgetBundle {
    var body: some Widget {
        LiveActivities()
        if #available(iOS 16.2, *) {
            DynamicActivityWidget()
        }
    }
}
