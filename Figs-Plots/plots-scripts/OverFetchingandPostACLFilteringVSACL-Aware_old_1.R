library(ggplot2)
library(dplyr)
library(scales)

p <- ggplot(df_wide, aes(x = agnostic_time, y = aware_time, color = QueryLabel)) +
  geom_abline(slope = 1, intercept = 0, linetype = "dashed", linewidth = 0.5, color = "black") +
  geom_point(size = 2.8, alpha = 0.95) +
  scale_x_log10(labels = label_number(big.mark = ",")) +
  scale_y_log10(labels = label_number(big.mark = ",")) +
  facet_wrap(~ WebID, scales = "free", ncol = 3) +
  labs(
    x = "ACL-agnostic Latency",
    y = "ACL-aware Latency",
    color = NULL
  ) +
  theme_bw(base_size = 11) +
  theme(
    panel.grid.minor = element_blank(),
    strip.text = element_text(face = "bold"),
    axis.title = element_text(face = "bold"),
    legend.position = c(0.84, 0.14),
    legend.direction = "horizontal",
    legend.box = "horizontal",
    legend.background = element_blank(),
    legend.key = element_blank(),
    legend.text = element_text(size = 9)
  ) +
  guides(
    color = guide_legend(nrow = 2, byrow = TRUE)
  )

print(p)

#ggsave(
#  "figure_acl_aware_vs_agnostic_single_compact_legend.png",
 # p,
#  width = 7.2,
#  height = 4.8,
#  dpi = 300
#)