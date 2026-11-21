# Research Brief · Controlled bias variance benchmark of block validated haMSMs against BAD NEUS and RiteWeight

- Category · Estimator audit
- Subfield · History Augmented MSMs & Koopman Models

## Problem Statement

Russo et al. 2021 established asymptotic coarse grained MFPT and committor consistency once sliding window weights relax under source sink boundaries, while Suarez et al. 2021 proved frame interval accuracy of unsymmetrized haMSMs. A controlled finite sample benchmark comparing odd even block cross validated k means haMSMs, BAD NEUS spectral stratification, and RiteWeight random tessellation reweighting on identical transient Weighted Ensemble segments remains missing.

## Concrete Attack Plan

Sample off equilibrium walker ensembles on the 49x49 Smoluchowski surface of Aristoff et al. 2023 and explicit solvent Chignolin from Chen et al. 2026, then measure root mean square log MFPT and committor error across microbin count, trajectory window length S, and odd even iteration splits.
