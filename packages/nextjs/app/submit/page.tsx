import Form from "./_component/Form";
import { NextPage } from "next";
import scaffoldConfig from "~~/scaffold.config";

const Submit: NextPage = () => {
  const { submissionsEnabled } = scaffoldConfig;

  if (!submissionsEnabled) {
    return <div className="flex items-center text-xl flex-col flex-grow pt-10 space-y-4">Submissions Closed</div>;
  }

  return (
    <div className="flex flex-col md:flex-row m-6 md:m-10 border border-black">
      <div className="w-[100%] md:w-5/12 border-r border-black p-4 md:p-12">
        <h2 className="text-2xl md:text-3xl mb-8">Before submitting</h2>
        <h3 className="text-xl underline">What makes a good LUKSO project?</h3>
        <p className="text-lg mb-8">
          A good LUKSO project typically involves contract and front-end interaction. It should solve a real problem or
          enhance the developer experience. Examples include implementing/extending your favorite LSP or adding a useful
          kit that extends any of our starter kits with more features or capabilities.
        </p>
        <h3 className="text-xl underline mt-10">Please pay attention to the following before submitting</h3>
        <ul className="list-disc pl-5 text-lg mt-4">
          <li>Use this form to submit both your completed speedrunLUKSO challenges AND your own LUKSO BUILDS</li>
          <li>Submit only your original work, disclose any pre-existing work used.</li>
          <li>Provide clear documentation and a 2-minute video showcasing your extension.</li>
          <li>Be respectful to all participants.</li>
          <li>Quality is more important than quantity. Focus on creating impactful BUILDS.</li>
        </ul>
      </div>
      <div className="w-[100%] md:w-7/12 p-4 md:p-12 bg-accent">
        <div className="flex items-center flex-col flex-grow">
          <h1 className="text-2xl md:text-3xl mb-8">Submit your build</h1>
          <Form />
        </div>
      </div>
    </div>
  );
};

export default Submit;
