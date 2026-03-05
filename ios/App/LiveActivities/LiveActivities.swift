import WidgetKit
import SwiftUI

struct LiveActivitiesEntry: TimelineEntry {
    let date: Date
}

struct LiveActivitiesProvider: TimelineProvider {
    func placeholder(in context: Context) -> LiveActivitiesEntry {
        LiveActivitiesEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (LiveActivitiesEntry) -> Void) {
        completion(LiveActivitiesEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LiveActivitiesEntry>) -> Void) {
        let entry = LiveActivitiesEntry(date: Date())
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }
}

struct LiveActivitiesEntryView: View {
    var entry: LiveActivitiesProvider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Recording Shortcuts")
                .font(.headline)
            Text("Open the app to start a new note")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
    }
}

struct LiveActivities: Widget {
    let kind: String = "LiveActivities"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LiveActivitiesProvider()) { entry in
            LiveActivitiesEntryView(entry: entry)
        }
        .configurationDisplayName("Live Activities")
        .description("Shows quick actions for recordings.")
    }
}
