"use client";

import { useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { Resource } from "@/lib/types";
import AuthPanel from "./components/AuthPanel";
import ResourceForm from "./components/ResourceForm";
import Feed from "./components/Feed";
import { useSocket } from "@/lib/useSocket";

export default function HomePage() {
  const { auth, ready, signIn, signOut } = useAuth();
  const socket = useSocket(auth);

  return (
    <main className="container">
      <h1>Bookmarked</h1>
      <p className="tagline">A shared board for resources worth revisiting.</p>

      {ready && <AuthPanel auth={auth} onSignIn={signIn} onSignOut={signOut} />}

      <section>
        <h2>Share a resource</h2>
        <ResourceForm auth={auth} />
      </section>

      <section>
        <h2>My Feed</h2>
        <Feed auth={auth} socket={socket} />
      </section>
    </main>
  );
}
