# Research Brief · Benchmark conditionally folded IDR false positive pLDDT structures under Weighted Ensemble plus RiteWeight equilibration

- Category · Settle now
- Subfield · Collective Variables & Deep Learning

## Problem Statement

Conditionally folded disordered regions exhibiting AlphaFold2 pLDDT >= 70 and hallucinated AlphaFold3 helices distort progress coordinate bounds and initial seed weights when mistaken for stable apo folds.

## Concrete Attack Plan

Select 10 conditionally folded human disordered segments from Alderson et al. (2023) alongside apo disordered controls from Mehdiabadi et al. (2025), seed explicit solvent Weighted Ensemble trajectories in OPC water from AlphaFold2, AlphaFold3, and AFSample2 models, and apply RiteWeight to evaluate relaxation toward experimental NMR chemical shifts.
