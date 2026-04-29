library(ggplot2)

df <- data.frame(
  Method = c(
    "ACL-aware Indexes",
    "ACL-aware Bloom Filters",
    "ACL-agnostic Indexes",
    "ACL-agnostic Bloom Filters"
  ),
  Storage_MB = c(31375, 79, 3065, 2.82),
  Latency_s = c(16.5, 10, 20, 8.0),
  ACL = c("ACL-aware", "ACL-aware", "ACL-agnostic", "ACL-agnostic"),
  Structure = c("Indexes", "Bloom Filters", "Indexes", "Bloom Filters")
)

ggplot(df, aes(x = Storage_MB, y = Latency_s, color = ACL, shape = Structure)) +
  geom_point(size = 6, alpha = 0.9) +
  geom_text(
    aes(label = Method),
    hjust = c(1, 0.5, 0.5, 0),
    vjust = c(-0.8, -0.8, -0.8, -0.8),
    size = 3.5,
    show.legend = FALSE
  ) +
  scale_x_log10(limits = c(2, 50000)) +
  scale_y_continuous(
    limits = c(min(df$Latency_s) - 5, max(df$Latency_s) + 5)
  ) +
  scale_color_manual(values = c("ACL-aware" = "darkgreen", "ACL-agnostic" = "darkred")) +
  scale_shape_manual(values = c("Indexes" = 15, "Bloom Filters" = 16)) +
  labs(
    title = "Storage Overhead vs Query Latency Trade-offs",
    x = "Metadata storage overhead (MB, log scale)",
    y = "Average query latency (s)",
    color = "Access-control awareness",
    shape = "Representation"
  ) +
  coord_cartesian(clip = "off") +
  theme_minimal(base_size = 13) +
  theme(
    plot.title = element_text(face = "bold", hjust = 0.5),
    legend.position = "right",
    plot.margin = margin(10, 110, 10, 10),
    panel.border = element_rect(color = "black", fill = NA, linewidth = 0.8),
    plot.background = element_blank()
  )