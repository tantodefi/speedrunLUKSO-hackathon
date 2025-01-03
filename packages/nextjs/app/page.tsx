"use client";

import type { NextPage } from "next";
import {
  Faq,
  HackathonInfo,
  Hero,
  PrizeInfo,
  StickySubmissionInfo,
  Timeline, // KitsoInfo,
} from "~~/components/extensions-hackathon/";

const Home: NextPage = () => {
  return (
    <div className="flex flex-col items-center mx-6">
      <Hero />
      <PrizeInfo />
      {/* <KitsoInfo /> */}
      <HackathonInfo />
      <Timeline />
      <Faq />
      <StickySubmissionInfo />
    </div>
  );
};

export default Home;
