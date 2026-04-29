library(ggplot2)
library(scales)

# --- Parameters (calibrated to Table 1) ---
N_fixed      <- 475000
idx_per_item <- 2.5e6 / N_fixed
agn_idx      <- 65e6
agn_bf       <- 2.6e6

# Heaps' Law: vocabulary V(N) = k * N^beta
# Bloom filter size proportional to vocabulary.
# Calibrate k so that at N=475K, bf = 96KB (our empirical anchor).
# bf_size(N) = 96e3 * (N / 475000)^beta
beta_mid  <- 0.5          # midpoint of Heaps' range
beta_lo   <- 0.4          # lower bound
beta_hi   <- 0.6          # upper bound

bf_at_N <- function(N, beta) 96e3 * (N / N_fixed)^beta   # bytes per WebID

# At fixed N=475K all three betas give 96KB — the band only opens when N varies.
# For this U-axis plot, bf per WebID is fixed; what changes is the LABEL and
# the honest acknowledgement that b ~ N^beta, not a true constant.
bf_per_u_mid <- bf_at_N(N_fixed, beta_mid)   # = 96000
bf_per_u_lo  <- bf_at_N(N_fixed, beta_lo)
bf_per_u_hi  <- bf_at_N(N_fixed, beta_hi)

# --- X axis ---
U <- c(1, 5, 10, 50, 100, 500, 1e3, 5e3, 1e4, 5e4, 1e5, 5e5, 1e6)

# --- Main data frame (four lines) ---
df <- data.frame(
  U = rep(U, 4),
  storage = c(
    idx_per_item * N_fixed * U,          # O(N·U)
    rep(agn_idx, length(U)),             # O(N)
    bf_per_u_mid * U,                    # O(U·N^beta) mid
    rep(agn_bf, length(U))               # O(b_agn)
  ),
  structure = factor(rep(c(
    "ACL-aware  index  \u2014  O(N\u00b7U)",
    "ACL-agnostic  index  \u2014  O(N)",
    "ACL-aware Bloom filter  \u2014  O(U\u00b7N^\u03b2)",
    "ACL-agnostic Bloom filter  \u2014  O(b)"
  ), each = length(U)),
  levels = c(
    "ACL-aware  index  \u2014  O(N\u00b7U)",
    "ACL-agnostic  index  \u2014  O(N)",
    "ACL-aware Bloom filter  \u2014  O(U\u00b7N^\u03b2)",
    "ACL-agnostic Bloom filter  \u2014  O(b)"
  ))
)

# --- Heaps' band: ribbon between beta_lo and beta_hi for ACL-aware BF ---
df_band <- data.frame(
  U      = U,
  y_lo   = bf_per_u_lo * U,
  y_hi   = bf_per_u_hi * U
)
# NOTE: at fixed N=475K the band is zero-width (all betas give 96KB).
# To make the band meaningful we let N vary implicitly by showing the
# range a reader should expect if N doubles or halves.
# More honest: show band as ±factor around the midpoint curve.
# bf(N*2, beta) / bf(N, beta) = 2^beta => range [2^0.4, 2^0.6] = [1.32, 1.52]
# We illustrate this as a shaded envelope around the BF mid line.
df_band$y_lo <- bf_per_u_mid * U / (2^beta_hi)   # if N were half
df_band$y_hi <- bf_per_u_mid * U * (2^beta_hi)   # if N were double

# --- Colours ---
colours <- c(
  "ACL-aware  index  \u2014  O(N\u00b7U)"   = "#D85A30",
  "ACL-agnostic  index  \u2014  O(N)"        = "#1D9E75",
  "ACL-aware Bloom filter  \u2014  O(U\u00b7N^\u03b2)" = "#7F77DD",
  "ACL-agnostic Bloom filter  \u2014  O(b)"           = "#888780"
)

linetypes <- c(
  "ACL-aware  index  \u2014  O(N\u00b7U)"   = "solid",
  "ACL-agnostic  index  \u2014  O(N)"        = "dashed",
  "ACL-aware Bloom filter  \u2014  O(U\u00b7N^\u03b2)" = "solid",
  "ACL-agnostic Bloom filter  \u2014  O(b)"           = "dashed"
)

# --- Byte formatter ---
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
  
  # Heaps' uncertainty band around ACL-aware BF line
  geom_ribbon(
    data = df_band,
    aes(x = U, ymin = y_lo, ymax = y_hi),
    inherit.aes = FALSE,
    fill = "#7F77DD", alpha = 0.12
  ) +
  
  geom_line(linewidth = 1.0) +
  
  geom_point(data = subset(df, structure %in% c(
    "ACL-aware  index  \u2014  O(N\u00b7U)",
    "ACL-aware Bloom filter  \u2014  O(U\u00b7N^\u03b2)"
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
    legend.position      = c(0.5, 0.98),
    legend.justification = c(1, 1),
    legend.box           = "vertical",
    legend.background    = element_rect(fill = "white", colour = "black"),
    legend.text          = element_text(size = 16),
    axis.title           = element_text(size = 18),
    axis.text            = element_text(size = 16),
    panel.grid.minor     = element_blank(),
    panel.border         = element_rect(colour = "black", fill = NA, linewidth = 0.8),
    plot.background      = element_blank()
  )

print(p)
ggsave("storage_complexity.png", p, width = 8, height = 5.5, dpi = 300)