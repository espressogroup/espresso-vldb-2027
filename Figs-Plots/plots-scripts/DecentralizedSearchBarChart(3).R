# Load necessary libraries
library(ggplot2)
library(dplyr)
library(tidyr)

# Define access levels
access_levels <- c("5%", "10%", "25%", "50%", "100%")

# Define search methods (NEW ORDER)
search_methods <- c(
  "Exhaustive Search",
  "Meta-Idx Sys-Level",
  "Meta-Idx Srv-Level",
  "Meta-Idx Sys+Srv-Levels",
  "Meta-BF Sys-Level",
  "Meta-BF Srv-Level",
  "Meta-BF Sys+Srv-Levels"
)

execution_times <- data.frame(
  AccessLevel = rep(access_levels, each = length(search_methods) * 3),
  QuerySize = rep(c("Q1","Q11","Q21"), times = length(access_levels) * length(search_methods)),
  ExecutionTime = c(
    
    # ---------- 5% ----------
    566.70,564.02,553.83,          # Exhaustive
    563.79,543.50,556.45,          # Meta-Idx Sys-Level
    26.55,19.77,18.14,             # Meta-Idx Srv-Level
    31.92,23.19,18.43,             # Meta-Idx Sys+Srv-Levels
    574.30,573.1,561.9,          # Meta-BF Sys-Level 
    36.51,33.66,17.00,             # Meta-BF Srv-Level 
    51.0932,46.15568,31.83582,           # Meta-BF Sys+Srv-Levels 
    
    # ---------- 10% ----------
    728.87248,746.75224,693.92985,
    520.12,505.89,510.34,
    36.60066,36.60066,41.96217,
    74.31134,47.81873,39.02741,
    738.40,756.8,703.6, #(placeholder)
    89.32836,54.28367,65.82481,#(placeholder)
    120.39008,53.01375,82.51843,
    
    # ---------- 25% ----------
    926.76629,996.25702,942.21388,
    480.56,470.23,460.90,
    27.34,21.78,20.56,
    173.80805,126.0166,96.32103,
    935.76629,1005,950,#(placeholder)
    407.89239,108.57816,139.32145,#(placeholder)
    373.70549,181.52797,139.97637,
    
    # ---------- 50% ----------
    1542.7326,1467.97753,1472.06777,
    450.78,440.56,430.23,
    26.78,22.45,21.12,
    362.00407,234.95416,184.25113,
    1551.6,1476.90,1481.37,#(placeholder)
    833.03814,309.06597,270.41087,#(placeholder)
    814.53831,236.3315,209.08558,
    
    # ---------- 100% ----------
    1364.48379,2751.51943,2543.80241,
    400.45,390.23,380.12,
    25.12,23.56,22.34,
    709.29884,469.78311,350.91208,
    1374.48,2761.53,2553.80,#(placeholder)
    1831.38941,724.60702,455.88027,#(placeholder)
    1752.45742,722.0498,620.22309
  ),
  
  Method = rep(search_methods, each = 3, times = length(access_levels))
)

# Ensure correct access level order
execution_times$AccessLevel <- factor(
  execution_times$AccessLevel,
  levels = c("5%","10%","25%","50%","100%")
)

# Ensure correct method order
execution_times$Method <- factor(
  execution_times$Method,
  levels = search_methods
)

# Plot
ggplot(execution_times, aes(x = QuerySize, y = ExecutionTime, fill = Method)) +
  geom_bar(stat="identity", position="dodge", color="black") +
  facet_wrap(~AccessLevel) +
  labs(
    x="Queries",
    y="Execution Time (s)",
    fill="Search Method"
  ) +
  theme_minimal() +
  theme(
    panel.border = element_rect(color="black", fill=NA, size=1),
    text = element_text(size=18),
    axis.text = element_text(size=14),
    axis.title = element_text(size=18, face="bold"),
    legend.title = element_text(size=16, face="bold"),
    legend.text = element_text(size=14),
    legend.position = c(0.90,0.25),
    plot.margin = margin(10,10,10,10),
    strip.text = element_text(size=18, face="bold"),
    aspect.ratio = 0.95
  )