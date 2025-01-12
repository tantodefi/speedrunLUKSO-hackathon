"use client";

import type { NextPage } from "next";
import {
  Faq,
  HackathonInfo,
  Hero,
  PrizeInfo,
  StickySubmissionInfo, // KitsoInfo,
} from "~~/components/extensions-hackathon/";

const Home: NextPage = () => {
  return (
    <div className="flex flex-col items-center mx-6">
      <Hero />
      <PrizeInfo />
      {/* <KitsoInfo /> */}
      <HackathonInfo />
      <Faq />
      <StickySubmissionInfo />
    </div>
  );
};

export default Home;
