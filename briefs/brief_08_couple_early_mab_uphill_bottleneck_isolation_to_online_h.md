# Research Brief · Couple early MAB uphill bottleneck isolation to online haMSM discrepancy variance walker allocation

- Category · Speed up
- Subfield · Adaptive Binning & Allocation

## Problem Statement

Pre steady state iterations lack reactive trajectories to parameterize microbin discrepancy functions h(x) and v(x), whereas heuristic MAB and MABL maintain uniform walker counts per bin even after barrier crossing commences.

## Concrete Attack Plan

Implement a two stage WESTPA 2.0 resampler driven by MAB uphill bottleneck selection during initial barrier ascent and transitioning to microbin haMSM w_u sigma_u walker allocation once target flux stabilizes, benchmarking flux variance on SynMD Trp cage and atomistic chignolin.
