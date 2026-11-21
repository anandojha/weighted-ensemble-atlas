# Research Brief · Shrinkage corrected hierarchical cluster block bootstrap for multi replicate Weighted Ensemble fluxes

- Category · Settle now
- Subfield · Statistical Estimators & Sibling Rare Event Methods

## Problem Statement

Current Weighted Ensemble uncertainty pipelines either apply Dirichlet Bayesian bootstrap to scalar per run mean fluxes (Mostofian & Zuckerman 2019) or block bootstrap pooled flux traces without correcting two stage cluster variance inflation (Davison & Hinkley 1997, Ng, Grieve & Carpenter 2013) or distinguishing n^(1/3) variance blocks from n^(1/5) two sided interval blocks (Hall, Horowitz & Jing 1995).

## Concrete Attack Plan

Implement a two stage Dirichlet replicate plus shrinkage corrected block bootstrap with target matched block exponents on the 15 NTL9 and 13 Protein G WESTPA datasets and measure empirical 95 percent interval coverage on synthetic heavy tailed renewal processes.
