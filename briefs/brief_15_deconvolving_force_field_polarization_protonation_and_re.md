# Research Brief · Deconvolving Force-Field Polarization, Protonation, and Resampling Bias in Interior Cavity k_off

- Category · Estimator audit
- Subfield · Ligand Binding, Unbinding & Residence Time

## Problem Statement

Steady-state Minimal Adaptive Binning Weighted Ensemble reproduced experimental gating mutagenesis in HIF-2alpha PAS-B while overestimating k_off 10^4-fold under fixed-charge ff19SB and GAFF2, whereas naive Markov models on REVO unbinding trajectories suffered 30-fold merging bias prior to MBC-MSM. A unified cross-estimator and polarizable/constant-pH benchmark on interior cavity dissociation is missing.

## Concrete Attack Plan

Re-simulate THS-017 escape from HIF-2alpha PAS-B (PDB 3H7W) and benzene escape from T4 lysozyme L99A (PDB 1L83) comparing fixed-charge ff19SB/OPC (with Ando 2023 temperature-matched viscosity scaling) against Drude polarizable Weighted Ensemble, then evaluate identical trajectory trees with raw Hill flux, RED, MBC-MSM, and RiteWeight against ZZ-exchange NMR k_off = 1.4 s^-1.
