  # Load libraries
  library(ggplot2)
  library(dplyr)
  library(scales)
  library(patchwork)
  library(cowplot)
  
  # Data
  df_wide <- data.frame(
    QueryLabel = factor(paste0("Q", 1:30), levels = paste0("Q", 1:30)),
    
    WebID = factor(rep(c("sagent0", "sagent1", "sagent2", "sagent3", "sagent4"), 6),
                   levels = c("sagent4", "sagent3", "sagent2", "sagent1", "sagent0")),
    
    WebID_Label = factor(rep(c("100%", "50%", "25%", "10%", "5%"), 6),
                         levels = c("5%", "10%", "25%", "50%", "100%")),
    
    agnostic_time = c(
      172418,159948,160174,171633,162039,
      1664479,976129,603054,331859,226239,
      1899111,1017443,593460,302128,89400,
      2252391,1288644,891287,449278,248268,
      1950887,1021016,566912,312838,192566,
      463218,290930,205762,155140,136820,
      961492,556421,337300,211343,162304,
      459441,306124,530654,164578,146460,
      529920,313957,226981,168867,158122,
      377508,296706,200515,163501,158121,
      539151,371158,255407,177916,159492,
      415440,268746,208538,153369,133722,
      225214,174162,147701,133801,128129,
      474348,301535,211503,164468,159168,
      540944,331273,231729,181086,158611,
      928049,583721,376091,216494,168420,
      1408761,764724,439143,256663,177317,
      1089035,601176,363895,221121,162006,
      1085768,600131,368319,220387,57121,
      405153,282793,179160,143708,130042,
      2270465,1182929,721505,389692,234311,
      1677462,888088,507994,280689,186655,
      1686742,907904,520168,294187,184107,
      1273395,680688,405628,241050,165851,
      2571573,1305694,699394,365975,218276,
      2428922,1269593,726454,353035,245779,
      2833750,1442007,778166,387887,227935,
      3135977,1560361,771432,317598,133857,
      124839,117395,118450,115719,114129,
      142034,132186,124842,124408,122959
    ) / 1000,
    
    aware_time = c(
      155647,155600,160174,171633,162039,
      1380419,703762,353630,152989,69255,
      1869887,933151,488590,192965,89400,
      2140616,1083359,571121,247081,205393,
      1933639,973834,488229,200208,101946,
      443197,229354,132868,53489,69760,
      936256,464525,242345,104386,49864,
      315611,165656,95342,43390,37774,
      373317,198142,117199,51269,36868,
      324866,162202,92760,48882,26705,
      437471,220920,134221,60830,29699,
      332808,174119,101080,44161,25516,
      222066,112625,63247,33052,21591,
      401198,336318,111831,50996,27956,
      438261,228182,122707,55117,29944,
      847115,431538,304125,110893,48110,
      1351388,712693,346876,147328,67835,
      1054863,527413,272012,115886,61041,
      1062884,557175,284650,117599,57121,
      368129,153638,82622,39781,23629,
      2209562,1145717,548333,230088,100142,
      1663048,846495,417719,174832,76410,
      1664598,841051,424939,175349,80761,
      1197356,602621,311913,129058,59353,
      2526046,1305694,620990,259777,107937,
      2425772,1202815,609325,247039,108279,
      3196125,1370178,684542,279743,117944,
      2525900,1305694,620990,259777,107937,
      114543,55763,30377,11597,5733,
      163685,73980,39821,18207,8141
    ) / 1000
  )
  
  
  # Base plot (remove axis labels)
  base_plot <- ggplot(df_wide, aes(x = agnostic_time, y = aware_time, color = QueryLabel)) +
    geom_abline(slope = 1, intercept = 0, linetype = "dashed",
                linewidth = 0.5, color = "gray50") +
    geom_point(size = 2.5, alpha = 0.8) +
    
    scale_x_log10(labels = label_number(accuracy = 0.1),
                  breaks = c(0.1, 1, 10, 100, 1000, 3000)) +
    scale_y_log10(labels = label_number(accuracy = 0.1),
                  breaks = c(0.1, 1, 10, 100, 1000, 3000)) +
    
    labs(x = NULL, y = NULL) +   # 🔴 remove per-panel labels
    
    guides(
      color = guide_legend(
        ncol = 4,
        byrow = TRUE,
        keyheight = 0.6,
        keywidth  = 0.6,
        override.aes = list(size = 2.5)
      )
    ) +
    
    theme_bw(base_size = 16) +
    theme(
      legend.position = "right",
      legend.text = element_text(size = 13),
      legend.title = element_text(size = 14, face = "bold"),
      
      panel.spacing = unit(0.4, "lines"),   # 🔴 compact panels
      plot.margin = margin(1, 1, 1, 1)
    )
  
  # Extract legend (tight)
  legend <- wrap_elements(
    cowplot::get_legend(
      base_plot +
        theme(
          legend.box.margin = margin(t = -10, b = -10),
          legend.margin = margin(0, 0, 0, 0)
        )
    )
  )
  
  # Remove legend from panels
  base_plot <- base_plot + theme(legend.position = "none")
  
  # Create panels
  plots <- lapply(levels(df_wide$WebID_Label), function(lvl) {
    base_plot %+% subset(df_wide, WebID_Label == lvl) +
      ggtitle(lvl) +
      theme(plot.margin = margin(1, 1, 1, 1))
  })
  
  # Layout (tight)
  panel_layout <-
    (plots[[1]] | plots[[2]] | plots[[3]]) /
    (plots[[4]] | plots[[5]] | legend)
  
  # 🔴 Add ONE global X and Y label (tight, no wasted space)
  final_plot <- cowplot::ggdraw() +
    cowplot::draw_plot(panel_layout, x = 0.06, y = 0.06, width = 0.88, height = 0.88) +
    cowplot::draw_label("ACL-Agnostic Search Time (sec)",
                        x = 0.5, y = 0.015, size = 16) +
    cowplot::draw_label("ACL-Aware Search Time (sec)",
                        x = 0.015, y = 0.5, angle = 90, size = 16)
  
  # Save
  ggsave("figure_final_layout.png", final_plot,
         width = 12, height = 7, dpi = 300)
  
  final_plot