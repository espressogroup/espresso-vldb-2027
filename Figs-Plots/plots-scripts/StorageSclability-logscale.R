library(ggplot2)
library(scales)

# --- Parameters (calibrated to Table 1) ---
N_fixed       <- 475000
idx_per_item  <- 2.5e6 / N_fixed
bf_per_u      <- 96e3
agn_idx       <- 65e6
agn_bf        <- 2.6e6

# --- X axis ---
U <- c(1, 5, 10, 50, 100, 500, 1e3, 5e3, 1e4, 5e4, 1e5, 5e5, 1e6)

# --- Data ---
df <- data.frame(
  U = rep(U, 4),
  storage = c(
    idx_per_item * N_fixed * U,
    rep(agn_idx, length(U)),
    bf_per_u * U,
    rep(agn_bf, length(U))
  ),
  structure = factor(rep(c(
    "ACL-aware inverted index  O(N\u00b7U)",
    "ACL-agnostic inverted index  O(N)",
    "ACL-aware Bloom filter  O(b\u00b7U)",
    "ACL-agnostic Bloom filter  O(b)"
  ), each = length(U)),
  levels = c(
    "ACL-aware inverted index  O(N\u00b7U)",
    "ACL-agnostic inverted index  O(N)",
    "ACL-aware Bloom filter  O(b\u00b7U)",
    "ACL-agnostic Bloom filter  O(b)"
  ))
)

# --- Colours ---
colours <- c(
  "ACL-aware inverted index  O(N\u00b7U)" = "#D85A30",
  "ACL-agnostic inverted index  O(N)"    = "#1D9E75",
  "ACL-aware Bloom filter  O(b\u00b7U)"  = "#7F77DD",
  "ACL-agnostic Bloom filter  O(b)"      = "#888780"
)

linetypes <- c(
  "ACL-aware inverted index  O(N\u00b7U)" = "solid",
  "ACL-agnostic inverted index  O(N)"    = "dashed",
  "ACL-aware Bloom filter  O(b\u00b7U)"  = "solid",
  "ACL-agnostic Bloom filter  O(b)"      = "dashed"
)

# --- Formatter ---
byte_fmt <- function(x) {
  dplyr::case_when(
    x >= 1e12 ~ paste0(round(x / 1e12, 1), " TB"),
    x >= 1e9  ~ paste0(round(x / 1e9,  1), " GB"),
    x >= 1e6  ~ paste0(round(x / 1e6,  1), " MB"),
    x >= 1e3  ~ paste0(round(x / 1e3,  0), " KB"),
    TRUE      ~ paste0(round(x),            " B")
  )
}

# --- Plot ---
p <- ggplot(df, aes(x = U, y = storage, colour = structure, linetype = structure)) +
  geom_line(linewidth = 1.0) +
  
  geom_point(data = subset(df, structure %in% c(
    "ACL-aware inverted index  O(N\u00b7U)",
    "ACL-aware Bloom filter  O(b\u00b7U)"
  )), size = 3) +
  
  scale_x_log10(
    name   = "Number of querying WebIDs (U)",
    breaks = c(1, 10, 100, 1e3, 1e4, 1e5, 1e6),
    labels = c("1", "10", "100", "1 K", "10 K", "100 K", "1 M")
  ) +
  
  scale_y_log10(
    name   = "Total storage (log scale)",
    breaks = c(1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12),
    labels = byte_fmt(c(1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12))
  ) +
  
  scale_colour_manual(values = colours, name = NULL) +
  scale_linetype_manual(values = linetypes, name = NULL) +
  
  theme_minimal(base_size = 18) +
  theme(
    # --- Legend inside plot ---
    legend.position      = c(0.45, 0.98),
    legend.justification = c(1, 1),
    legend.box           = "vertical",
    legend.background    = element_rect(fill = "white", colour = "black"),
    
    legend.text  = element_text(size = 16),
    
    axis.title   = element_text(size = 18),
    axis.text    = element_text(size = 16),
    
    panel.grid.minor = element_blank(),
    
    panel.border = element_rect(colour = "black", fill = NA, linewidth = 0.8),
    plot.background = element_blank()
  )

print(p)

# --- Save (matched proportions) ---
ggsave("storage_complexity.png", p, width = 8, height = 5.5, dpi = 300)