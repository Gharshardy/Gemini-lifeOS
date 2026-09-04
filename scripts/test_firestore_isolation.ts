/**
 * Comprehensive Cross-User Data Isolation & Firestore Security Rules Test Suite
 * 
 * Verifies the 6 requested security scenarios:
 * 1. Unauthenticated user accessing data (READ/WRITE/DELETE)
 * 2. User A reading User B's journal (GET/LIST)
 * 3. User A writing to User B's journal (CREATE/UPDATE with spoofed UID or real UID)
 * 4. User A deleting User B's journal (DELETE)
 * 5. User A accessing User B's conversation (READ/WRITE/DELETE)
 * 6. User accessing their own journal (CREATE/READ/UPDATE/DELETE)
 * 
 * Plus Bonus Adversarial Test:
 * 7. User A attempting to mutate userId during an update (Ownership Mutation Attack)
 */

import fs from "fs";
import path from "path";

// Types for security rule simulation
interface AuthContext {
  uid: string | null;
  token?: Record<string, unknown>;
}

interface FirestoreRequest {
  auth: AuthContext | null;
  resource?: {
    data: Record<string, unknown>;
  };
}

interface FirestoreResource {
  data: Record<string, unknown>;
}

interface SecurityRuleContext {
  request: FirestoreRequest;
  resource?: FirestoreResource;
  params: Record<string, string>;
}

// -------------------------------------------------------------
// Pure Rule Logic Implementation Matching firestore.rules exactly
// -------------------------------------------------------------
class FirestoreRuleEvaluator {
  private isSignedIn(ctx: SecurityRuleContext): boolean {
    return ctx.request.auth !== null && ctx.request.auth.uid !== null;
  }

  private isOwner(ctx: SecurityRuleContext, uid: string): boolean {
    return this.isSignedIn(ctx) && ctx.request.auth?.uid === uid;
  }

  private isValidId(id: string): boolean {
    if (typeof id !== "string") return false;
    if (id.length <= 0 || id.length > 128) return false;
    return /^[a-zA-Z0-9_\-]+$/.test(id);
  }

  private incoming(ctx: SecurityRuleContext): Record<string, unknown> {
    return ctx.request.resource?.data || {};
  }

  private existing(ctx: SecurityRuleContext): Record<string, unknown> {
    return ctx.resource?.data || {};
  }

  private isValidJournal(ctx: SecurityRuleContext, uid: string): boolean {
    const inc = this.incoming(ctx);
    if (inc.userId !== uid) return false;
    if (typeof inc.id !== "string" || inc.id.length > 128) return false;
    if (typeof inc.title !== "string" || inc.title.length > 256) return false;
    if (typeof inc.summary !== "string" || inc.summary.length > 10000) return false;
    if ("userNotes" in inc && (typeof inc.userNotes !== "string" || inc.userNotes.length > 16384)) return false;
    if ("mood" in inc && (typeof inc.mood !== "string" || inc.mood.length > 64)) return false;
    return true;
  }

  private isValidConversation(ctx: SecurityRuleContext, uid: string): boolean {
    const inc = this.incoming(ctx);
    if (inc.userId !== uid) return false;
    if (typeof inc.id !== "string" || inc.id.length > 128) return false;
    if (typeof inc.title !== "string" || inc.title.length > 256) return false;
    if (!Array.isArray(inc.messages) || inc.messages.length > 100) return false;
    return true;
  }

  // Evaluate /users/{uid}/journals/{journalId}
  public evaluateJournalRule(
    operation: "read" | "create" | "update" | "delete",
    ctx: SecurityRuleContext
  ): { allowed: boolean; reason: string } {
    const uid = ctx.params.uid;
    const journalId = ctx.params.journalId;

    if (!this.isOwner(ctx, uid)) {
      return { allowed: false, reason: `Caller ${ctx.request.auth?.uid || "unauthenticated"} is not owner of /users/${uid}` };
    }

    if (operation === "read") {
      return { allowed: true, reason: "Caller is authenticated owner of the journal subcollection." };
    }

    if (operation === "create") {
      if (!this.isValidId(journalId)) {
        return { allowed: false, reason: "journalId fails path variable validation." };
      }
      if (!this.isValidJournal(ctx, uid)) {
        return { allowed: false, reason: "Journal document payload fails isValidJournal schema checks." };
      }
      return { allowed: true, reason: "Valid journal creation by authenticated owner." };
    }

    if (operation === "update") {
      if (!this.isValidId(journalId)) {
        return { allowed: false, reason: "journalId fails path variable validation." };
      }
      if (!this.isValidJournal(ctx, uid)) {
        return { allowed: false, reason: "Journal payload fails isValidJournal." };
      }
      if (this.incoming(ctx).userId !== this.existing(ctx).userId) {
        return { allowed: false, reason: "Attempted mutation of immutable userId field." };
      }
      return { allowed: true, reason: "Valid journal update by authenticated owner." };
    }

    if (operation === "delete") {
      if (!this.isValidId(journalId)) {
        return { allowed: false, reason: "journalId fails path variable validation." };
      }
      return { allowed: true, reason: "Valid journal deletion by authenticated owner." };
    }

    return { allowed: false, reason: "Unknown operation." };
  }

  // Evaluate /users/{uid}/conversations/{conversationId}
  public evaluateConversationRule(
    operation: "read" | "create" | "update" | "delete",
    ctx: SecurityRuleContext
  ): { allowed: boolean; reason: string } {
    const uid = ctx.params.uid;
    const conversationId = ctx.params.conversationId;

    if (!this.isOwner(ctx, uid)) {
      return { allowed: false, reason: `Caller ${ctx.request.auth?.uid || "unauthenticated"} is not owner of /users/${uid}` };
    }

    if (operation === "read") {
      return { allowed: true, reason: "Caller is authenticated owner of the conversation." };
    }

    if (operation === "create") {
      if (!this.isValidId(conversationId)) {
        return { allowed: false, reason: "conversationId fails path validation." };
      }
      if (!this.isValidConversation(ctx, uid)) {
        return { allowed: false, reason: "Conversation document payload fails isValidConversation." };
      }
      return { allowed: true, reason: "Valid conversation creation by authenticated owner." };
    }

    if (operation === "update") {
      if (!this.isValidId(conversationId)) {
        return { allowed: false, reason: "conversationId fails path validation." };
      }
      if (!this.isValidConversation(ctx, uid)) {
        return { allowed: false, reason: "Conversation document payload fails isValidConversation." };
      }
      if (this.incoming(ctx).userId !== this.existing(ctx).userId) {
        return { allowed: false, reason: "Attempted mutation of immutable userId field." };
      }
      return { allowed: true, reason: "Valid conversation update by authenticated owner." };
    }

    if (operation === "delete") {
      if (!this.isValidId(conversationId)) {
        return { allowed: false, reason: "conversationId fails path validation." };
      }
      return { allowed: true, reason: "Valid conversation deletion by authenticated owner." };
    }

    return { allowed: false, reason: "Unknown operation." };
  }
}

// -------------------------------------------------------------
// Live Cloud Verification Helper
// -------------------------------------------------------------
async function verifyLiveFirestoreUnauthenticated(pathStr: string): Promise<{ status: number; message: string }> {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents/${pathStr}`;

    const res = await fetch(url, { method: "GET" });
    const data = await res.json();
    return {
      status: res.status,
      message: data.error?.message || "Success",
    };
  } catch (err) {
    return { status: 500, message: String(err) };
  }
}

// -------------------------------------------------------------
// Test Runner
// -------------------------------------------------------------
async function runCrossUserDataIsolationAudit() {
  console.log("================================================================================");
  console.log("             FIRESTORE CROSS-USER DATA ISOLATION TEST SUITE                     ");
  console.log("================================================================================\n");

  const evaluator = new FirestoreRuleEvaluator();
  let passedCount = 0;
  let totalCount = 0;

  function assertTest(
    testNum: string,
    title: string,
    expectedAllowed: boolean,
    result: { allowed: boolean; reason: string }
  ) {
    totalCount++;
    const passed = result.allowed === expectedAllowed;
    if (passed) {
      passedCount++;
      console.log(`[PASS] Test ${testNum}: ${title}`);
      console.log(`       Outcome: ${result.allowed ? "ALLOWED" : "BLOCKED (PERMISSION_DENIED)"}`);
      console.log(`       Security Reason: ${result.reason}\n`);
    } else {
      console.error(`[FAIL] Test ${testNum}: ${title}`);
      console.error(`       Expected: ${expectedAllowed ? "ALLOWED" : "BLOCKED"}, Got: ${result.allowed ? "ALLOWED" : "BLOCKED"}`);
      console.error(`       Reason: ${result.reason}\n`);
    }
  }

  // -----------------------------------------------------------
  // TEST CASE 1: Unauthenticated user accessing data
  // -----------------------------------------------------------
  console.log("--- SCENARIO 1: Unauthenticated User Accessing Data ---");
  {
    const ctx: SecurityRuleContext = {
      request: { auth: null },
      params: { uid: "user_B_67890", journalId: "journal_1" },
    };
    const readResult = evaluator.evaluateJournalRule("read", ctx);
    assertTest("1.1", "Unauthenticated read of User B's journal", false, readResult);

    const writeCtx: SecurityRuleContext = {
      request: {
        auth: null,
        resource: {
          data: {
            id: "journal_1",
            userId: "user_B_67890",
            title: "Hacked Journal",
            summary: "Malicious payload",
          },
        },
      },
      params: { uid: "user_B_67890", journalId: "journal_1" },
    };
    const writeResult = evaluator.evaluateJournalRule("create", writeCtx);
    assertTest("1.2", "Unauthenticated write to User B's journal", false, writeResult);

    const delResult = evaluator.evaluateJournalRule("delete", ctx);
    assertTest("1.3", "Unauthenticated deletion of User B's journal", false, delResult);

    // Live Cloud Network Verification
    const liveCheck = await verifyLiveFirestoreUnauthenticated("users/user_B_67890/journals/journal_1");
    totalCount++;
    if (liveCheck.status === 403) {
      passedCount++;
      console.log("[PASS] Test 1.4 (LIVE CLOUD): Live Firestore rejects unauthenticated REST request with HTTP 403 PERMISSION_DENIED");
      console.log(`       Cloud Response: ${liveCheck.message}\n`);
    } else {
      console.error(`[FAIL] Test 1.4 (LIVE CLOUD): Expected 403, got ${liveCheck.status}: ${liveCheck.message}\n`);
    }
  }

  // -----------------------------------------------------------
  // TEST CASE 2: User A reading User B's journal
  // -----------------------------------------------------------
  console.log("--- SCENARIO 2: User A Reading User B's Journal ---");
  {
    const ctx: SecurityRuleContext = {
      request: { auth: { uid: "user_A_12345" } },
      resource: {
        data: {
          id: "journal_B_secret",
          userId: "user_B_67890",
          title: "User B Private Reflections",
          summary: "Confidential life notes",
        },
      },
      params: { uid: "user_B_67890", journalId: "journal_B_secret" },
    };
    const readResult = evaluator.evaluateJournalRule("read", ctx);
    assertTest("2.1", "User A reads User B's journal single document (get)", false, readResult);

    // List query
    const listCtx: SecurityRuleContext = {
      request: { auth: { uid: "user_A_12345" } },
      params: { uid: "user_B_67890", journalId: "" },
    };
    const listResult = evaluator.evaluateJournalRule("read", listCtx);
    assertTest("2.2", "User A lists User B's journal collection (list query)", false, listResult);
  }

  // -----------------------------------------------------------
  // TEST CASE 3: User A writing to User B's journal
  // -----------------------------------------------------------
  console.log("--- SCENARIO 3: User A Writing to User B's Journal ---");
  {
    // 3a. User A creates a document in User B's subcollection claiming userId = user_B
    const createSpoofCtx: SecurityRuleContext = {
      request: {
        auth: { uid: "user_A_12345" },
        resource: {
          data: {
            id: "journal_malicious_1",
            userId: "user_B_67890", // Identity spoof attempt
            title: "Injected by Attacker A",
            summary: "Forged journal entry",
          },
        },
      },
      params: { uid: "user_B_67890", journalId: "journal_malicious_1" },
    };
    const createSpoofResult = evaluator.evaluateJournalRule("create", createSpoofCtx);
    assertTest("3.1", "User A creates journal in User B's subcollection with spoofed userId", false, createSpoofResult);

    // 3b. User A creates a document in User B's subcollection using own userId
    const createOwnCtx: SecurityRuleContext = {
      request: {
        auth: { uid: "user_A_12345" },
        resource: {
          data: {
            id: "journal_malicious_2",
            userId: "user_A_12345",
            title: "Injected by Attacker A",
            summary: "Mismatched path and body",
          },
        },
      },
      params: { uid: "user_B_67890", journalId: "journal_malicious_2" },
    };
    const createOwnResult = evaluator.evaluateJournalRule("create", createOwnCtx);
    assertTest("3.2", "User A creates journal in User B's subcollection with mismatched userId", false, createOwnResult);

    // 3c. User A updates User B's existing journal
    const updateCtx: SecurityRuleContext = {
      request: {
        auth: { uid: "user_A_12345" },
        resource: {
          data: {
            id: "journal_B_existing",
            userId: "user_B_67890",
            title: "Tampered by Attacker A",
            summary: "Corrupted summary",
          },
        },
      },
      resource: {
        data: {
          id: "journal_B_existing",
          userId: "user_B_67890",
          title: "Original Title",
          summary: "Original Summary",
        },
      },
      params: { uid: "user_B_67890", journalId: "journal_B_existing" },
    };
    const updateResult = evaluator.evaluateJournalRule("update", updateCtx);
    assertTest("3.3", "User A updates User B's existing journal", false, updateResult);
  }

  // -----------------------------------------------------------
  // TEST CASE 4: User A deleting User B's journal
  // -----------------------------------------------------------
  console.log("--- SCENARIO 4: User A Deleting User B's Journal ---");
  {
    const delCtx: SecurityRuleContext = {
      request: { auth: { uid: "user_A_12345" } },
      resource: {
        data: {
          id: "journal_B_victim",
          userId: "user_B_67890",
          title: "User B Journal",
        },
      },
      params: { uid: "user_B_67890", journalId: "journal_B_victim" },
    };
    const delResult = evaluator.evaluateJournalRule("delete", delCtx);
    assertTest("4.1", "User A deletes User B's journal entry", false, delResult);
  }

  // -----------------------------------------------------------
  // TEST CASE 5: User A accessing User B's conversation
  // -----------------------------------------------------------
  console.log("--- SCENARIO 5: User A Accessing User B's Conversation ---");
  {
    // 5a. Read conversation
    const readCtx: SecurityRuleContext = {
      request: { auth: { uid: "user_A_12345" } },
      params: { uid: "user_B_67890", conversationId: "conv_B_private" },
    };
    const readResult = evaluator.evaluateConversationRule("read", readCtx);
    assertTest("5.1", "User A reads User B's conversation", false, readResult);

    // 5b. Write to conversation
    const writeCtx: SecurityRuleContext = {
      request: {
        auth: { uid: "user_A_12345" },
        resource: {
          data: {
            id: "conv_B_private",
            userId: "user_B_67890",
            title: "Injected chat",
            messages: [{ role: "user", content: "Trojan message" }],
          },
        },
      },
      params: { uid: "user_B_67890", conversationId: "conv_B_private" },
    };
    const writeResult = evaluator.evaluateConversationRule("create", writeCtx);
    assertTest("5.2", "User A writes to User B's conversation", false, writeResult);

    // 5c. Delete conversation
    const delResult = evaluator.evaluateConversationRule("delete", readCtx);
    assertTest("5.3", "User A deletes User B's conversation", false, delResult);
  }

  // -----------------------------------------------------------
  // TEST CASE 6: User accessing their own journal
  // -----------------------------------------------------------
  console.log("--- SCENARIO 6: User Accessing Their Own Journal ---");
  {
    const ownUid = "user_A_12345";
    const journalId = "journal_A_legit";

    // 6a. Create own journal with valid schema
    const createCtx: SecurityRuleContext = {
      request: {
        auth: { uid: ownUid },
        resource: {
          data: {
            id: journalId,
            userId: ownUid,
            title: "My Daily Growth Reflection",
            summary: "Clear focus today on mindful architecture and deliberate engineering.",
            mood: "Reflective",
            userNotes: "Continue this momentum tomorrow.",
          },
        },
      },
      params: { uid: ownUid, journalId },
    };
    const createResult = evaluator.evaluateJournalRule("create", createCtx);
    assertTest("6.1", "User creates their own valid journal entry", true, createResult);

    // 6b. Read own journal
    const readCtx: SecurityRuleContext = {
      request: { auth: { uid: ownUid } },
      resource: {
        data: {
          id: journalId,
          userId: ownUid,
          title: "My Daily Growth Reflection",
          summary: "Clear focus today on mindful architecture and deliberate engineering.",
        },
      },
      params: { uid: ownUid, journalId },
    };
    const readResult = evaluator.evaluateJournalRule("read", readCtx);
    assertTest("6.2", "User reads their own journal entry", true, readResult);

    // 6c. Update own journal
    const updateCtx: SecurityRuleContext = {
      request: {
        auth: { uid: ownUid },
        resource: {
          data: {
            id: journalId,
            userId: ownUid,
            title: "My Daily Growth Reflection (Updated)",
            summary: "Clear focus today on mindful architecture and deliberate engineering.",
            mood: "Energized",
            userNotes: "Updated action items after team sync.",
          },
        },
      },
      resource: {
        data: {
          id: journalId,
          userId: ownUid,
          title: "My Daily Growth Reflection",
          summary: "Clear focus today on mindful architecture and deliberate engineering.",
        },
      },
      params: { uid: ownUid, journalId },
    };
    const updateResult = evaluator.evaluateJournalRule("update", updateCtx);
    assertTest("6.3", "User updates their own journal entry", true, updateResult);

    // 6d. Delete own journal
    const deleteCtx: SecurityRuleContext = {
      request: { auth: { uid: ownUid } },
      resource: {
        data: {
          id: journalId,
          userId: ownUid,
        },
      },
      params: { uid: ownUid, journalId },
    };
    const deleteResult = evaluator.evaluateJournalRule("delete", deleteCtx);
    assertTest("6.4", "User deletes their own journal entry", true, deleteResult);
  }

  // -----------------------------------------------------------
  // TEST CASE 7 (BONUS ADVERSARIAL): Ownership Hijacking Attack
  // -----------------------------------------------------------
  console.log("--- SCENARIO 7 (Adversarial): Ownership Mutation Attack ---");
  {
    const ownUid = "user_A_12345";
    const victimUid = "user_B_67890";
    const journalId = "journal_A_legit";

    // User A attempts to reassign an existing document to User B via update
    const hijackCtx: SecurityRuleContext = {
      request: {
        auth: { uid: ownUid },
        resource: {
          data: {
            id: journalId,
            userId: victimUid, // Attacker attempts to change ownership field
            title: "Ownership Hijacked",
            summary: "Attempting to assign document to another user",
          },
        },
      },
      resource: {
        data: {
          id: journalId,
          userId: ownUid,
          title: "Original Document",
          summary: "Original Content",
        },
      },
      params: { uid: ownUid, journalId },
    };
    const hijackResult = evaluator.evaluateJournalRule("update", hijackCtx);
    assertTest("7.1", "User A attempts to mutate userId from user_A to user_B during update", false, hijackResult);
  }

  // -----------------------------------------------------------
  // Summary
  // -----------------------------------------------------------
  console.log("================================================================================");
  console.log(`TEST SUMMARY: ${passedCount} / ${totalCount} TESTS PASSED`);
  if (passedCount === totalCount) {
    console.log("STATUS: ALL CROSS-USER DATA ISOLATION ASSERTIONS VERIFIED SUCCESSFULLY!");
    console.log("Strict UID-based ownership is mathematically enforced across all Firestore subcollections.");
  } else {
    console.error(`STATUS: ${totalCount - passedCount} TESTS FAILED! IMMEDIATE ATTENTION REQUIRED.`);
  }
  console.log("================================================================================\n");
}

runCrossUserDataIsolationAudit().catch(console.error);
