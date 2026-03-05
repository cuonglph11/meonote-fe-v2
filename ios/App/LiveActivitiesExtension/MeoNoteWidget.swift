import WidgetKit
import SwiftUI

struct MeoNoteWidgetEntry: TimelineEntry {
    let date: Date
}

struct MeoNoteWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> MeoNoteWidgetEntry {
        MeoNoteWidgetEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (MeoNoteWidgetEntry) -> Void) {
        completion(MeoNoteWidgetEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MeoNoteWidgetEntry>) -> Void) {
        let entry = MeoNoteWidgetEntry(date: Date())
        let timeline = Timeline(entries: [entry], policy: .never)
        completion(timeline)
    }
}

struct MeoNoteWidgetEntryView: View {
    var entry: MeoNoteWidgetProvider.Entry

    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            smallWidget
        case .systemMedium:
            mediumWidget
        default:
            smallWidget
        }
    }

    var smallWidget: some View {
        VStack(spacing: 8) {
            Image(systemName: "mic.fill")
                .font(.system(size: 32))
                .foregroundStyle(.white)

            Text("Quick Record")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.white)

            Text("Tap to start")
                .font(.system(size: 11))
                .foregroundStyle(.white.opacity(0.7))
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            LinearGradient(
                colors: [Color(red: 0.35, green: 0.5, blue: 1.0), Color(red: 0.25, green: 0.35, blue: 0.85)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }

    var mediumWidget: some View {
        HStack(spacing: 16) {
            VStack(spacing: 8) {
                Image(systemName: "mic.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(.white)

                Text("Quick Record")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.white)
            }
            .frame(maxHeight: .infinity)
            .padding(.horizontal, 8)

            VStack(alignment: .leading, spacing: 6) {
                Label("Tap to start recording", systemImage: "waveform")
                    .font(.system(size: 12))
                    .foregroundStyle(.white.opacity(0.9))

                Label("Auto-transcription", systemImage: "text.bubble")
                    .font(.system(size: 12))
                    .foregroundStyle(.white.opacity(0.9))

                Label("AI-powered notes", systemImage: "sparkles")
                    .font(.system(size: 12))
                    .foregroundStyle(.white.opacity(0.9))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            LinearGradient(
                colors: [Color(red: 0.35, green: 0.5, blue: 1.0), Color(red: 0.25, green: 0.35, blue: 0.85)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }
}

struct MeoNoteWidget: Widget {
    let kind: String = "MeoNoteWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MeoNoteWidgetProvider()) { entry in
            MeoNoteWidgetEntryView(entry: entry)
                .widgetURL(URL(string: "meonote://record"))
        }
        .configurationDisplayName("Quick Record")
        .description("Tap to open Meo Note and start recording.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
