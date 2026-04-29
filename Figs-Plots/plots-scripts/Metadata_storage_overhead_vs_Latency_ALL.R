library(ggplot2)
library(patchwork)

# --------------------------
# Panel (a): Full query latency
# --------------------------
df_full <- data.frame(
  Method = c(
    "ACL-aware Indexes",
    "ACL-aware Bloom Filters",
    "ACL-agnostic Indexes",
    "ACL-agnostic Bloom Filters"
  ),
  Storage_MB = c(31375, 79, 3065, 2.82),
  Metric_s = c(118.7, 98.11, 150, 134.9),
  ACL = c("ACL-aware", "ACL-aware", "ACL-agnostic", "ACL-agnostic"),
  Structure = c("Indexes", "Bloom Filters", "Indexes", "Bloom Filters")
)

# --------------------------
# Panel (b): Source-selection latency
# --------------------------
df_source <- data.frame(
  Method = c(
    "ACL-aware Indexes",
    "ACL-aware Bloom Filters",
    "ACL-agnostic Indexes",
    "ACL-agnostic Bloom Filters"
  ),
  Storage_MB = c(31375, 79, 3065, 2.82),
  Metric_s = c(16.5, 6.13, 20, 6.64),
  ACL = c("ACL-aware", "ACL-aware", "ACL-agnostic", "ACL-agnostic"),
  Structure = c("Indexes", "Bloom Filters", "Indexes", "Bloom Filters")
)

make_plot <- function(df, panel_title, y_label) {
  ggplot(df, aes(x = Storage_MB, y = Metric_s, color = ACL, shape = Structure)) +
    geom_point(size = 5.2, alpha = 0.9) +
    geom_text(
      aes(label = Method),
      hjust = c(1, 0.5, 0.5, 0),
      vjust = c(-0.7, -0.7, -0.7, -0.7),
      size = 2.9,
      show.legend = FALSE
    ) +
    scale_x_log10(limits = c(2, 50000)) +
    scale_y_continuous(
      limits = c(min(df$Metric_s) - 5, max(df$Metric_s) + 5)
    ) +
    scale_color_manual(values = c("ACL-aware" = "darkgreen", "ACL-agnostic" = "darkred")) +
    scale_shape_manual(values = c("Indexes" = 15, "Bloom Filters" = 16)) +
    labs(
      title = panel_title,
      x = "Storage overhead (MB, log scale)",
      y = y_label,
      color = "Access-control",
      shape = "Representation"
    ) +
    coord_cartesian(clip = "off") +
    theme_minimal(base_size = 18) +
    theme(
      plot.title = element_text(face = "bold", hjust = 0.5, size = 16),
      axis.title = element_text(size = 18),
      axis.text = element_text(size = 16),
      legend.position = "bottom",
      legend.title = element_text(size = 16),
      legend.text = element_text(size = 16),
      legend.box = "horizontal",
      legend.margin = margin(0, 0, 0, 0),
      legend.key.height = unit(0.5, "lines"),
      legend.key.width = unit(0.9, "lines"),
      plot.margin = margin(5, 5, 5, 5),
      panel.border = element_rect(color = "black", fill = NA, linewidth = 0.8),
      plot.background = element_blank()
    )
}

p1 <- make_plot(
  df_full,
  "(a) Full Query Latency",
  "Avg. query latency (s)"
)

p2 <- make_plot(
  df_source,
  "(b) Source-Selection Latency",
  "Avg. source-selection latency (s)"
)

combined_plot <-
  (p1 + p2 + plot_layout(guides = "collect")) &
  theme(
    legend.position = "bottom",
    plot.margin = margin(2, 2, 2, 2)
  )

combined_plot