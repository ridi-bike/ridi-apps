import React, { useState } from "react";

export function Waitlist() {
	const [submitted, setSubmitted] = useState(false)

	if (submitted) {
		<div>Thank you</div>
	}
  return (
    <form
      onSubmit={async (e) => {
				setSubmitted(true);
				e.preventDefault();
				const formData = new FormData()
				formData.set("email", e.target.email.value)
				formData.set("name", "RIDI_WAITLIST");
				formData.set("content", "RIDI_WAITLIST");
				try {
					await fetch("https://contact-us.toms-jansons.workers.dev", {
						method: "post",
						body: formData,
						redirect: "manual"
					});
				} catch {
				}
      }}
      method="post"
    >
      <input
        className="appearance-none bg-transparent rounded-[14px] h-12 w-64 mb-4 text-gray-200 focus:outline-none focus:bg-gray-300 focus:text-gray-800 focus:border-gray-400 mr-3 py-2 px-3"
        type="email"
        name="email"
        placeholder="some@example.com"
        aria-label="Email Address"
        required
      />

      <button
        type="submit"
        className="px-[35px] py-5 w-64 bg-zinc-900 hover:bg-white text-white hover:text-black border rounded-[14px] justify-start items-start gap-2.5 inline-flex"
      >
        <div className="text-center text-xl font-normal leading-7">
          Sign me up
        </div>
      </button>
    </form>
  );
}
