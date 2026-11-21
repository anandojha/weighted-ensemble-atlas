# Research Brief · Unified RED and RiteWeight Rate Estimator with Lugsail Genealogical Intervals

- Category · Estimator audit
- Subfield · Steady State, Hill Flux & Non Markovian Rates

## Problem Statement

Pre steady state Weighted Ensemble rate calculations confront simultaneous finite event duration ramp bias in DeGrave, Bogetti & Chong 2021, fixed bin reweighting discretization bias in Kania et al. 2026, and negative first order O(1/b) covariance bias under positive serial correlation in Vats & Flegal 2021. Existing workflows apply RED, haMSM, or RiteWeight separately without accounting for shared walker genealogy in confidence interval widths.

## Concrete Attack Plan

Evaluate synthetic and 208 us atomistic Trp cage Weighted Ensemble segments from Kania 2026 alongside calbindin switching runs reanalyzed in DeGrave, Bogetti & Chong 2021. Compute stationary segment weights via RiteWeight paired with subtraction free GTH linear solves from Grassmann, Taksar & Heyman 1985, normalize sink arrival weights by the RED cumulative event duration integral after MSER 5 startup truncation from White, Cobb & Spratt 2002, and measure empirical coverage of lugsail batch means intervals across independent replicates.
