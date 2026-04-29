# Load necessary libraries
library(ggplot2)
library(dplyr)
library(tidyr)

# Define access levels
access_levels <- c("5%", "10%", "25%", "50%", "100%")

# Define search methods
search_methods <- c(
  "Exhaustive Search",
  "Meta-System-Level only",
  "Meta-Server-Level only",
  "Meta-Combined",
  "Meta-Bloom Filter-System-Level only",
  "Meta-Bloom Filter-Server-Level only",
  "Meta-Bloom Filter-Combined"
)

# Sample execution times for each method and access level
set.seed(123)

execution_times <- data.frame(
  AccessLevel = rep(access_levels, each = length(search_methods) * 3),  # 3 queries per method
  QuerySize = rep(c("Q1", "Q2", "Q3"), times = length(access_levels) * length(search_methods)),
  ExecutionTime = c(
    # =========================
    # Access Level 5%
    # =========================
    566.70, 564.02, 553.83,   # Exhaustive Search
    563.79, 543.50, 556.45,   # Meta-System-Level only
    26.55, 19.77, 18.14,      # Meta-Server-Level only
    31.92, 23.19, 18.43,      # Meta-Combined
    48.32, 36.71, 42.85,      # Meta-Bloom Filter-System-Level only
    27.43, 22.11, 24.89,      # Meta-Bloom Filter-Server-Level only
    177.70, 37.26, 122.43,    # Meta-Bloom Filter-Combined
    
    # =========================
    # Access Level 10%
    # =========================
    728.87248, 746.75224, 693.92985,  # Exhaustive Search
    520.12, 505.89, 510.34,           # Meta-System-Level only
    36.60066, 36.60066, 41.96217,     # Meta-Server-Level only
    74.31134, 47.81873, 39.02741,     # Meta-Combined
    63.27, 52.48, 57.16,              # Meta-Bloom Filter-System-Level only
    33.84, 29.67, 31.22,              # Meta-Bloom Filter-Server-Level only
    150.23, 40.12, 115.87,            # Meta-Bloom Filter-Combined
    
    # =========================
    # Access Level 25%
    # =========================
    926.76629, 996.25702, 942.21388,  # Exhaustive Search
    480.56, 470.23, 460.90,           # Meta-System-Level only
    27.34, 21.78, 20.56,              # Meta-Server-Level only
    173.80805, 126.0166, 96.32103,    # Meta-Combined
    81.54, 66.38, 71.25,              # Meta-Bloom Filter-System-Level only
    41.93, 35.72, 38.41,              # Meta-Bloom Filter-Server-Level only
    130.45, 45.76, 100.12,            # Meta-Bloom Filter-Combined
    
    # =========================
    # Access Level 50%
    # =========================
    1542.7326, 1467.97753, 1472.06777, # Exhaustive Search
    450.78, 440.56, 430.23,            # Meta-System-Level only
    26.78, 22.45, 21.12,               # Meta-Server-Level only
    362.00407, 234.95416, 184.25113,   # Meta-Combined
    102.47, 88.91, 93.64,              # Meta-Bloom Filter-System-Level only
    49.55, 43.28, 45.91,               # Meta-Bloom Filter-Server-Level only
    110.56, 50.45, 90.67,              # Meta-Bloom Filter-Combined
    
    # =========================
    # Access Level 100%
    # =========================
    1364.48379, 2751.51943, 2543.80241, # Exhaustive Search
    400.45, 390.23, 380.12,             # Meta-System-Level only
    25.12, 23.56, 22.34,                # Meta-Server-Level only
    709.29884, 469.78311, 350.91208,    # Meta-Combined
    126.84, 111.36, 118.59,             # Meta-Bloom Filter-System-Level only
    58.71, 52.64, 55.43,                # Meta-Bloom Filter-Server-Level only
    95.67, 55.34, 85.23                 # Meta-Bloom Filter-Combined
  ),
  Method = rep(search_methods, each = 3, times = length(access_levels))
)

# Reorder factors
execution_times$AccessLevel <- factor(
  execution_times$AccessLevel,
  levels = c("5%", "10%", "25%", "50%", "100%")
)

execution_times$QuerySize <- factor(
  execution_times$QuerySize,
  levels = c("Q1", "Q2", "Q3")
)

execution_times$Method <- factor(
  execution_times$Method,
  levels = c(
    "Exhaustive Search",
    "Meta-System-Level only",
    "Meta-Server-Level only",
    "Meta-Combined",
    "Meta-Bloom Filter-System-Level only",
    "Meta-Bloom Filter-Server-Level only",
    "Meta-Bloom Filter-Combined"
  )
)

# Plot
ggplot(execution_times, aes(x = QuerySize, y = ExecutionTime, fill = Method)) +
  geom_bar(
    stat = "identity",
    position = position_dodge(width = 0.85),
    color = "black",
    width = 0.8
  ) +
  facet_wrap(~ AccessLevel, ncol = 3) +
  labs(
    x = "Queries",
    y = "Execution Time (s)",
    fill = "Search Method"
  ) +
  scale_x_discrete(drop = FALSE) +
  theme_minimal() +
  theme(
    panel.border = element_rect(color = "black", fill = NA, linewidth = 1),
    text = element_text(size = 18),
    axis.text = element_text(size = 14),
    axis.title = element_text(size = 18, face = "bold"),
    legend.title = element_text(size = 16, face = "bold"),
    legend.text = element_text(size = 14),
    legend.position = "right",
    plot.margin = margin(10, 10, 10, 10),
    strip.text = element_text(size = 18, face = "bold"),
    aspect.ratio = 0.95
  )