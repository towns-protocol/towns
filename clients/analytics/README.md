# Summary

This folder is for code, and any other backups related to analytics.
Example, rudderstack collects a lot of user data, including PII. It has a
`Transformation` feature on its dashboard that lets you scrub PII data.
Code is written in JavaScript. Save a copy of of the JavaScript in this folder.

You cannot apply multiple transformations to the same connection. So for example Sundial collections
need transformPiiWithDebugFilter, while the other collections need transformPii.
