library(tidyverse)
library(grid)

# --------------------------
# Data
# --------------------------
df <- tribble(
  ~Model, ~TopS, ~nDCG5, ~P5, ~nDCG10, ~P10, ~nDCG20, ~P20, ~MAP,
  "BM25_global", 1, 0.444, 0.353, 0.290, 0.177, 0.189, 0.088, 0.036,
  "BM25_global", 2, 0.634, 0.567, 0.451, 0.334, 0.294, 0.167, 0.068,
  "BM25_global", 3, 0.751, 0.709, 0.560, 0.450, 0.377, 0.240, 0.097,
  "BM25_global", 4, 0.802, 0.777, 0.646, 0.558, 0.447, 0.312, 0.123,
  "BM25_global", 5, 0.835, 0.813, 0.716, 0.644, 0.504, 0.372, 0.147,
  
  "LM_global", 1, 0.421, 0.353, 0.275, 0.177, 0.180, 0.088, 0.033,
  "LM_global", 2, 0.551, 0.518, 0.415, 0.334, 0.271, 0.167, 0.060,
  "LM_global", 3, 0.625, 0.607, 0.501, 0.431, 0.347, 0.240, 0.084,
  "LM_global", 4, 0.636, 0.613, 0.564, 0.514, 0.410, 0.312, 0.106,
  "LM_global", 5, 0.654, 0.632, 0.596, 0.553, 0.459, 0.371, 0.125,
  
  "W2V_cosine", 1, 0.384, 0.353, 0.251, 0.177, 0.164, 0.088, 0.030,
  "W2V_cosine", 2, 0.437, 0.414, 0.376, 0.334, 0.246, 0.167, 0.052,
  "W2V_cosine", 3, 0.485, 0.473, 0.420, 0.382, 0.313, 0.240, 0.073,
  "W2V_cosine", 4, 0.498, 0.488, 0.446, 0.412, 0.369, 0.312, 0.087,
  "W2V_cosine", 5, 0.501, 0.495, 0.466, 0.441, 0.393, 0.347, 0.101,
  
  "W2V_Euclidean", 1, 0.385, 0.353, 0.251, 0.177, 0.164, 0.088, 0.030,
  "W2V_Euclidean", 2, 0.438, 0.416, 0.378, 0.334, 0.247, 0.167, 0.052,
  "W2V_Euclidean", 3, 0.483, 0.471, 0.421, 0.382, 0.313, 0.240, 0.073,
  "W2V_Euclidean", 4, 0.502, 0.492, 0.445, 0.411, 0.369, 0.312, 0.087,
  "W2V_Euclidean", 5, 0.501, 0.497, 0.464, 0.434, 0.392, 0.341, 0.100
)

# --------------------------
# Reshape
# --------------------------
df_long <- df %>%
  pivot_longer(
    cols = c(nDCG5, P5, nDCG10, P10, nDCG20, P20, MAP),
    names_to = "Metric",
    values_to = "Value"
  ) %>%
  mutate(
    Metric = factor(Metric, levels = c("nDCG5", "P5", "nDCG10", "P10", "nDCG20", "P20", "MAP")),
    Model = factor(Model, levels = c("BM25_global", "LM_global", "W2V_cosine", "W2V_Euclidean"))
  )

# --------------------------
# Plot
# --------------------------
p <- ggplot(df_long, aes(x = TopS, y = Value, color = Model, group = Model)) +
  geom_line(linewidth = 0.6) +
  geom_point(size = 1.2) +
  facet_wrap(~ Metric, ncol = 4, scales = "free_y") +
  scale_x_continuous(breaks = 1:5) +
  labs(
    x = "Top Servers (S)",
    y = "Metric Value",
    color = "Model"
  ) +
  theme_minimal(base_size = 7) +
  theme(
    # ultra-tight layout
    plot.margin = margin(1, 1, 1, 1),
    panel.spacing = unit(1, "pt"),
    
    # borders for publication clarity
    panel.border = element_rect(color = "black", fill = NA, linewidth = 0.3),
    strip.background = element_rect(fill = "grey90", color = "black", linewidth = 0.3),
    
    # compact typography
    axis.title = element_text(size = 18),
    axis.text = element_text(size = 14),
    strip.text = element_text(size = 18, face = "bold"),
    legend.text = element_text(size = 14),
    legend.title = element_text(size = 18),
    
    # compact legend
    legend.position = "bottom",
    legend.key.height = unit(6, "pt"),
    legend.key.width  = unit(10, "pt")
  )

print(p)

