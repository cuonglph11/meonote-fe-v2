//
//  LiveActivitiesExtensionLiveActivity.swift
//  LiveActivitiesExtension
//
//  Created by Chris Le on 5/3/26.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct LiveActivitiesExtensionAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct LiveActivitiesExtensionLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LiveActivitiesExtensionAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension LiveActivitiesExtensionAttributes {
    fileprivate static var preview: LiveActivitiesExtensionAttributes {
        LiveActivitiesExtensionAttributes(name: "World")
    }
}

extension LiveActivitiesExtensionAttributes.ContentState {
    fileprivate static var smiley: LiveActivitiesExtensionAttributes.ContentState {
        LiveActivitiesExtensionAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: LiveActivitiesExtensionAttributes.ContentState {
         LiveActivitiesExtensionAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: LiveActivitiesExtensionAttributes.preview) {
   LiveActivitiesExtensionLiveActivity()
} contentStates: {
    LiveActivitiesExtensionAttributes.ContentState.smiley
    LiveActivitiesExtensionAttributes.ContentState.starEyes
}
