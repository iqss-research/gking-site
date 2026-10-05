---
title: "Replication Certification at Publication: Checkable by Anyone, Anywhere, in Seconds, Forever"
slug: "replication-certification-at-publication"
url: /certify/
date: '2026-10-05'
authors:
  - Gary King
  - Yiqing Xu
  - Leo Y. Yang
publication_types:
  - working_paper
abstract: |-
  Authors increasingly deposit replication datasets—the data and code behind published results—in archives such as Dataverse, and journals increasingly require it. But to the ever-skeptical scientific community a deposit alone proves little, so authors keep paying: months while a data editor reruns analyses, years answering readers’ questions, and rancor as failed replications become accusations because no record establishes what actually ran. We introduce a certificate: a cryptographically signed record of the deposited files and output captured by specialized logging software. It replaces the data editor’s rerun with evidence of the author’s own run that anyone can check, which no one, including the archive, can backdate, and no one can fake without risking detection. Certification asks little of anyone and benefits everyone: The author deposits, then reruns the analysis one extra time under an archive-issued random seed; the archive automatically hashes, signs, timestamps it in Bitcoin’s blockchain, and stores the record—confidential data included, under restricted access—but never runs the analysis; the journal simply checks a website that the certificate exists; and anyone can verify the record in seconds, or replay any step of it, even decades later.
links:
  - type: pdf
    url: files/replication-certification.pdf
  - type: appendix
    label: Appendix
    url: files/replication-certification-supp.pdf
image:
  alt_text: "Certification at a glance, in four cards: how it works (the author readies a dataset, the archive certifies one run, anyone checks it), why the record is proof, what each party pays today and gains once certified, and what certification does not cover"

# Blind link: reachable only by people who have the URL. `blind: true` emits
# a noindex/nofollow robots meta (gk-blind-robots head hook) and removes the
# page from Pagefind's index; `build.list: never` keeps it out of every page
# collection (the /publication/ tabs, the homepage cards, the sitemap, RSS,
# llms-full.txt, publication/index.json). The slug is deliberately absent
# from writings_legacy_map.json. No alias at /publication/<slug>/: a blind
# page wants one URL, not a second, guessable one.
blind: true
build:
  list: never
---

**[This paper is in progress; the page's URL is unlisted. Comments welcome!]**
