import Image from "next/image";
import { CommandDisplay } from "./CommandDisplay";

export const HackathonInfo = () => {
  return (
    <div className="flex flex-col w-full border border-1 border-t-0 border-black">
      <div className="p-4 md:p-12 border-b border-black flex flex-col md:flex-row">
        <div className="flex-1 md:p-12 pr-0 md:pr-6 order-2 md:order-1">
          <h2 className="text-3xl md:text-6xl mb-8 md:mb-16">
            What is <br /> SpeedrunLUKSO?
          </h2>
          <div className="md:text-xl mb-8 md:mb-16">
            <p className="mb-4">
              SpeedrunLUKSO is a open-source curriculum for building decentralized applications on LUKSO.
            </p>
            <p className="mb-4">
              SpeedrunLUKSO is a set of challenges that help you get up to speed building with Universal Profiles and
              the LSPs (LUKSO Standards Proposals).
            </p>
            <p className="mb-4">
              With live-updating frontends, pre-built components, custom hooks, and a built-in block explorer, it
              accelerates development from prototype to production-ready dApps.
            </p>
          </div>
          <CommandDisplay command="npx create-eth@latest -e ValentineCodes/universal-profile-extension" />
          <div className="flex flex-wrap justify-center md:justify-start gap-12">
            <a href="" target="_blank" className="underline pl-0 font-medium md:text-2xl">
              Website
            </a>
            <a href="https://t.me/+DlLg2q8IeII4Mjhh" target="_blank" className="underline font-medium md:text-2xl">
              Telegram
            </a>
            <a href="https://github.com/" target="_blank" className="underline font-medium md:text-2xl">
              Github
            </a>
          </div>
        </div>
        <div className="flex-1 xl:p-12 mt-6 md:mt-0 mb-6 md:mb-0 order-1 md:order-2">
          <Image
            src="/se-2-sneak-peek.png"
            alt="Scaffold-ETH 2 Sneak Peek"
            width={1000}
            height={500}
            layout="responsive"
            loading="lazy"
          />
        </div>
      </div>

      <div className="p-4 md:p-8 lg:p-12 flex flex-col lg:flex-row">
        <div className="w-full lg:w-3/5 mb-8 lg:mb-0 lg:pr-8">
          <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
            {" "}
            {/* 16:9 Aspect Ratio */}
            <iframe
              src="https://www.youtube.com/embed/ifinfGaAc8Y?si=ejI4uKKgY7-6z3G-"
              title="Scaffold-ETH 2 Extensions Introduction"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full"
            ></iframe>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-12 mt-8">
            <a
              href="https://docs.scaffoldeth.io/extensions"
              target="_blank"
              className="underline pl-0 font-medium md:text-2xl"
            >
              SE2 Docs
            </a>
            <a
              href="https://github.com/scaffold-eth/create-eth-extensions"
              target="_blank"
              className="underline pl-0 font-medium md:text-2xl"
            >
              Examples
            </a>
            <a
              href="hhttps://www.cookbook.dev/libraries/LSP-Contracts"
              target="_blank"
              className="underline pl-0 font-medium md:text-2xl"
            >
              Cookbook.dev LSP Contracts
            </a>
            <a href="https://docs.lukso.tech/" target="_blank" className="underline pl-0 font-medium md:text-2xl">
              LUKSO DOCS
            </a>
            <a
              href="https://github.com/lukso-network/LIPs"
              target="_blank"
              className="underline pl-0 font-medium md:text-2xl"
            >
              Github LIPs
            </a>
            <a
              href="https://github.com/lukso-network/LIPs/tree/main/LSPs"
              target="_blank"
              className="underline pl-0 font-medium md:text-2xl"
            >
              Github LSPs
            </a>
            <a
              href="https://github.com/ValentineCodes/universal-profile-extension"
              target="_blank"
              className="underline pl-0 font-medium md:text-2xl"
            >
              Universal Profile SE2 Extension
            </a>
            {/* <a
              href="https://github.com/lukso-network/LIPs"
              target="_blank"
              className="underline pl-0 font-medium md:text-2xl"
            >
              Github LIPs
            </a>
            <a
              href="https://github.com/lukso-network/LIPs"
              target="_blank"
              className="underline pl-0 font-medium md:text-2xl"
            >
              Github LIPs
            </a>
            <a
              href="https://github.com/lukso-network/LIPs"
              target="_blank"
              className="underline pl-0 font-medium md:text-2xl"
            >
              Github LIPs
            </a>
            <a
              href="https://github.com/lukso-network/LIPs"
              target="_blank"
              className="underline pl-0 font-medium md:text-2xl"
            >
              Github LIPs
            </a>
            <a
              href="https://github.com/lukso-network/LIPs"
              target="_blank"
              className="underline pl-0 font-medium md:text-2xl"
            >
              Github LIPs
            </a> */}
          </div>
        </div>
        <div className="w-full lg:w-2/5">
          <h2 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl mb-6 lg:mb-8">
            How to complete speedrunLUKSO challenges?
          </h2>
          <div className="text-base md:text-lg lg:text-xl mb-6 lg:mb-8">
            <p className="mb-4">
              It&apos;s easy to begin completing the speedrunLUKSO challenges. To begin, simply clone the speedrunLUKSO
              repo using the below command in your terminal:
            </p>
            <CommandDisplay command="git clone https://github.com/Dev-Rel-as-a-Service/SpeedRunLUKSO.git" />
            <p className="mb-4">
              Refer to the <code>readme.md</code> file and use &apos;git&apos; to switch branches to different
              challenges. We recommend completing them in order.
            </p>
            <p className="mb-4">
              As you complete each challenge return here to submit them. Submitting will allow us to verify your work
              and knowledge regarding developing with Universal Profiles and the LSPs.
            </p>
            <p className="mb-4">
              After completing all the speedrunLUKSO challenges we encourage you to submit your own LUKSO BUILD to be
              eligible for a micro-grant
            </p>
            <p className="mb-4">Bootstrap a new LUKSO BUILD:</p>
          </div>
          <CommandDisplay command="npx create-eth@latest -e ValentineCodes/universal-profile-extension" />
          <div className="flex flex-wrap justify-center md:justify-start gap-12 mt-8">
            <a
              href="https://docs.scaffoldeth.io/extensions"
              target="_blank"
              className="underline pl-0 font-medium md:text-2xl"
            >
              SE2 Docs
            </a>
            <a
              href="https://github.com/scaffold-eth/create-eth-extensions"
              target="_blank"
              className="underline pl-0 font-medium md:text-2xl"
            >
              Examples
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
