---
title: "Replication Certification at Publication: Checkable by Anyone, Anywhere, in Seconds, Forever"
slug: "replication-certification-at-publication"
url: /certify/
date: '2026-09-19'
authors:
  - Gary King
  - Yiqing Xu
  - Leo Y. Yang
publication_types:
  - working_paper
abstract: |-
  Authors increasingly deposit replication datasets—the data and code behind published results—in archives such as Dataverse, and journals increasingly require it. But a deposit alone proves little, so authors keep paying: months while a data editor reruns analyses, years answering readers’ questions, and rancor as failed replications become accusations because no record establishes what actually ran. We introduce a certificate: a cryptographically signed record of one run of the deposited files. It establishes what the data editor’s rerun establishes, without the rerun, on evidence anyone can check and which no one, including the archive, can backdate or feasibly fake. Certification asks little of anyone and benefits everyone: The author deposits, then reruns the analysis under software that records the run; the archive hashes, signs, timestamps it in Bitcoin’s blockchain, and stores the record—confidential data included, under restricted access—but never runs the analysis; the journal need only confirm that the certificate exists, and may require the manuscript’s tables and figures to match it; and anyone can verify the record in seconds, or replay any step of it, even decades later.
links:
  - type: pdf
    url: files/replication-certification.pdf
image:
  alt_text: "Certification at a glance, in three cards: how it works (the author readies a dataset, the archive certifies one run, anyone checks it), why the record is proof, and what each party pays today and gains once certified"

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
