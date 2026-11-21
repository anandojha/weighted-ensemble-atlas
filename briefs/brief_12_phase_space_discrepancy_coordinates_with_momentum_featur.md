# Research Brief · Phase space discrepancy coordinates with momentum features for low friction atomistic folding

- Category · Settle now
- Subfield · History Augmented MSMs & Koopman Models

## Problem Statement

Aristoff et al. 2023 proved asymptotic flux variance optimality for rectangular bins in discrepancy h(x) and local variation v(x), whereas low friction atomistic folding runs still display large replicate spread and Chen et al. 2026 emphasized that underdamped Langevin committors depend on joint configuration momentum states (X_t, P_t).

## Concrete Attack Plan

Train the stop gradient semigroup committor solver of Chen et al. 2026 with and without velocity inputs across low friction and water friction Langevin regimes, then supply learned discrepancy and variation coordinates to WESTPA 2.0 adaptive allocation Russo et al. 2022.
