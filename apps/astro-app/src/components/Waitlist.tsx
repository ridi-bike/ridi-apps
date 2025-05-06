import { useRef, useState } from "react";

export function Waitlist() {
  const [submitted, setSubmitted] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  if (submitted) {
    return <div className="h-28">Added to mailing list, thank you</div>;
  }

  return (
    <form
      onSubmit={async (e) => {
        setSubmitted(true);
        e.preventDefault();
        try {
          fetch(
            `${import.meta.env.PUBLIC_RIDI_API_URL}/get-notified?email=${emailRef.current?.value || ""}`,
          );
          setSubmitted(true);
        } catch (err) {
          console.error("Error while submitting:", err);
        }
      }}
    >
      <input
        className="mb-4 mr-3 h-12 w-64 appearance-none rounded-[14px] bg-transparent px-3 py-2 text-gray-200 focus:border-gray-400 focus:bg-gray-300 focus:text-gray-800 focus:outline-none"
        type="email"
        ref={emailRef}
        name="email"
        placeholder="some@example.com"
        aria-label="Email Address"
        required
      />

      <button
        type="submit"
        className="inline-flex w-64 items-start justify-start gap-2.5 rounded-[14px] border bg-zinc-900 px-[35px] py-5 text-white hover:bg-white hover:text-black"
      >
        <div className="text-center text-xl font-normal leading-7">
          Get notified
        </div>
      </button>
    </form>
  );
}
