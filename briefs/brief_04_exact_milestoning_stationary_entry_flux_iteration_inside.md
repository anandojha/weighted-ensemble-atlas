# Research Brief · Exact Milestoning stationary entry flux iteration inside Weighted Ensemble Milestoning

- Category · Estimator audit
- Subfield · Statistical Estimators & Sibling Rare Event Methods

## Problem Statement

Single structure milestone initialization in Ray and Andricioaei (2020) inflates protein ligand k_off variance, whereas harmonic restraint release seeding in Ray, Gokey, Mobley and Andricioaei (2020) approximates equilibrium slice Boltzmann weights rather than the true non equilibrium first hitting density of Exact Milestoning (Aristoff, Bello Rivas & Elber 2016).

## Concrete Attack Plan

Propagate terminal milestone hitting coordinates and weights across iterative Weighted Ensemble Milestoning cycles without harmonic restraints and quantify k_off and free energy bias relative to Exact Milestoning on a 2D Muller Brown potential and FKBP ligand dissociation.
