import Link from "next/link";
export default function Privacy() {
  return (
    <main className="survey prose">
      <Link href="/">← Back to survey</Link>
      <h1>
        Your take.
        <br />
        Your privacy.
      </h1>
      <p>
        This independent personal research project explores perceptions of Nike.
        It is not official Nike research.
      </p>
      <h2>What is collected</h2>
      <p>
        Your age band, country, field of work, interests, brand opinions,
        purchase behavior, written answers, an anonymous session identifier,
        survey version and completion timestamps. No name, email, exact address
        or IP address is stored in the research database. Please avoid personal
        details in written answers.
      </p>
      <h2>How it is used</h2>
      <p>
        Responses can be viewed and exported by anyone who opens the public
        dashboard at /dashboard. An unfinished draft is saved in this browser
        and removed after successful submission. The public survey needs no
        account.
      </p>
      <h2>Retention and contact</h2>
      <p>
        The intended retention period is{" "}
        {process.env.NEXT_PUBLIC_RETENTION_MONTHS || "12"} months. The owner is
        responsible for deleting expired research records and exports. Contact:{" "}
        {process.env.NEXT_PUBLIC_OWNER_CONTACT ||
          "Owner contact not configured yet"}
        .
      </p>
      <p>
        Hosting providers may process technical connection information in their
        own infrastructure logs. The survey application does not add IP
        addresses or device tracking to research records.
      </p>
    </main>
  );
}
