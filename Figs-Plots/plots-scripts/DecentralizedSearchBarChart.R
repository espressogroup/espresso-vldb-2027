# Load necessary libraries
library(ggplot2)
library(dplyr)
library(tidyr)

# Define access levels
access_levels <- c("5%", "10%", "25%", "50%", "100%")

# Define search methods
search_methods <- c("Exhaustive Search", "Meta-System-Level only", "Meta-Server-Level only", "Meta-Combined", "Meta-Bloom Filter")

# Sample execution times for each method and access level
set.seed(123)
execution_times <- data.frame(
  AccessLevel = rep(access_levels, each = length(search_methods) * 3), # 3 queries per method
  QuerySize = rep(c("Q1", "Q2", "Q3"), times = length(access_levels) * length(search_methods)),
  ExecutionTime = c(
    # Data for Access Level 5%
    566.70, 564.02, 553.83,  # Exhaustive
    563.79, 543.50, 556.45,  # Meta-System-Level only
    177.70, 37.26, 122.43,   # Meta-Bloom Filter
    26.55, 19.77, 18.14,     # Meta-Server-Level only >>>>>>>>>>>>>>>>>>.>>>>>>>>>>>>>>>>>>>>>>>...
    31.92, 23.19, 18.43,     # Meta-Combined 
    
    # Data for Access Level 10% (Replace with actual data)
    728.87248, 746.75224, 693.92985,  # Exhaustive
    520.12, 505.89, 510.34,  # Meta-System-Level only
    150.23, 40.12, 115.87,   # Meta-Bloom Filter
    36.60066, 36.60066, 41.96217,     # Meta-Server-Level only
    74.31134, 47.81873, 39.02741,     # Meta-Combined
    
    # Data for Access Level 25% (Replace with actual data)
    926.76629, 996.25702, 942.21388,  # Exhaustive
    480.56, 470.23, 460.90,  # Meta-System-Level only
    130.45, 45.76, 100.12,   # Meta-Bloom Filter
    27.34, 21.78, 20.56,     # Meta-Server-Level only
    173.80805, 126.0166, 96.32103,     # Meta-Combined
    
    # Data for Access Level 50% (Replace with actual data)
    1542.7326, 1467.97753, 1472.06777,  # Exhaustive
    450.78, 440.56, 430.23,  # Meta-System-Level only
    110.56, 50.45, 90.67,    # Meta-Bloom Filter
    26.78, 22.45, 21.12,     # Meta-Server-Level only
    362.00407, 234.95416, 184.25113,     # Meta-Combined
    
    # Data for Access Level 100% (Replace with actual data)
    1364.48379, 2751.51943, 2543.80241,  # Exhaustive
    400.45, 390.23, 380.12,  # Meta-System-Level only
    95.67, 55.34, 85.23,     # Meta-Bloom Filter
    25.12, 23.56, 22.34,     # Meta-Server-Level only
    709.29884, 469.78311, 350.91208      # Meta-Combined
  ),
  Method = rep(search_methods, each = 3, times = length(access_levels))
)

# Reorder AccessLevel to make "5%" first
execution_times$AccessLevel <- factor(execution_times$AccessLevel, levels = c("5%", "10%", "25%", "50%", "100%"))

# Ensure method order is consistent across charts
execution_times$Method <- factor(execution_times$Method, levels = c("Exhaustive Search", "Meta-System-Level only", "Meta-Bloom Filter", "Meta-Server-Level only", "Meta-Combined"))

# Generate separate charts for each access level
ggplot(execution_times, aes(x = QuerySize, y = ExecutionTime, fill = Method)) +
  geom_bar(stat = "identity", position = "dodge", color = "black") +
  facet_wrap(~ AccessLevel) +  # Separate chart per access level
  labs(
    x = "Queries",
    y = "Execution Time (s)",
    fill = "Search Method"
  ) +
  scale_x_discrete() +  # Ensure X-axis labels appear for all charts
  theme_minimal() +
  theme(
    panel.border = element_rect(color = "black", fill = NA, size = 1),
    text = element_text(size = 18),  # Increase overall text size
    axis.text = element_text(size = 14),  # Increase axis tick labels size
    axis.title = element_text(size = 18, face = "bold"),  # Increase axis title size
    legend.title = element_text(size = 16, face = "bold"),  # Increase legend title size
    legend.text = element_text(size = 14),  # Increase legend text size
    legend.position = c(0.90, 0.25),
    plot.margin = margin(10, 10, 10, 10),  # Increased bottom margin for x-axis labels
    strip.text = element_text(size = 18, face = "bold"),  # Increase facet label size
    aspect.ratio = 0.95,
  )