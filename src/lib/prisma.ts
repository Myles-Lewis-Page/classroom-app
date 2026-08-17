import { PrismaClient, Prisma } from "@prisma/client";
import { encryptValue, decryptValue, isEncrypted } from "./encryption";

// ---------- FIELD-LEVEL ENCRYPTION ----------
// Which fields on which models get encrypted at rest. Keep this list in
// sync with the "Fields to encrypt" table from the encryption rollout -
// only genuinely sensitive fields (student PII, parent contact, IEP/
// behavior notes) are here. IDs, dates used for scheduling, statuses,
// grades, and anything used for search/sort/filter are deliberately left
// out, since encrypting those would break querying across the app.
const FIELD_MAP: Record<string, string[]> = {
  // NOTE: dob is a DateTime column in the schema, not String - it can't be
  // encrypted in place without changing its column type (which would touch
  // every date-comparison query that reads it). Left as plaintext for now;
  // flag to Myles if this needs revisiting.
  Student: ["firstName", "lastName"],
  Parent: ["name", "phone", "email", "notes"],
  IEP: ["accommodations", "goals", "caseManager", "subSafeSummary", "serviceMinutes"],
  Allergy: ["allergen", "reaction", "notes"],
  DietaryRestriction: ["restriction", "notes"],
  StudentSupport: ["notes"],
  BehaviorNote: ["note"],
  BehaviorEntry: ["comment"],
  ParentContactLog: ["comment"],
  Observation: ["note"],
  PraiseNote: ["note"],
  ChaperoneInterest: ["studentName", "parentName", "contactInfo", "note"],
  EventChaperone: ["parentName"],
  Relationship: ["notes"],
};

// Maps a Prisma nested-write relation field name (as it appears in
// `data`, e.g. `student.create({ data: { parents: { create: [...] } } })`)
// to the model it creates/updates, so nested writes get encrypted too -
// not just direct `prisma.parent.create(...)` calls. Relation field names
// in this schema are unique enough not to collide across models.
const RELATION_MODEL: Record<string, string> = {
  parents: "Parent",
  ieps: "IEP",
  allergies: "Allergy",
  dietaryRestrictions: "DietaryRestriction",
  supports: "StudentSupport",
  behaviorNotes: "BehaviorNote",
  behaviorEntries: "BehaviorEntry",
  parentContactLogs: "ParentContactLog",
  observations: "Observation",
  praiseNotes: "PraiseNote",
  chaperoneInterests: "ChaperoneInterest",
  eventChaperones: "EventChaperone",
  chaperoneInterest: "ChaperoneInterest",
  relationshipsFrom: "Relationship",
  relationshipsTo: "Relationship",
  behaviorNote: "BehaviorNote",
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !(v instanceof Date) && !Array.isArray(v);
}

// Encrypts the sensitive fields (per FIELD_MAP) on a single data payload
// for `modelName`, then recurses into any nested relation writes found on
// it (create/createMany/update/upsert/connectOrCreate).
function encryptDataNode(node: unknown, modelName: string | undefined): unknown {
  if (Array.isArray(node)) {
    return node.map((el) => encryptDataNode(el, modelName));
  }
  if (!isPlainObject(node)) return node;

  const out: Record<string, unknown> = { ...node };

  if (modelName && FIELD_MAP[modelName]) {
    for (const field of FIELD_MAP[modelName]) {
      if (typeof out[field] === "string") {
        out[field] = encryptValue(out[field] as string);
      }
    }
  }

  for (const key of Object.keys(out)) {
    const targetModel = RELATION_MODEL[key];
    if (targetModel && isPlainObject(out[key])) {
      out[key] = encryptRelationWrite(out[key] as Record<string, unknown>, targetModel);
    }
  }

  return out;
}

// Handles the nested-write shape for a relation field: { create: ...,
// createMany: { data: [...] }, update: ..., upsert: ..., connectOrCreate: ... }
function encryptRelationWrite(
  relValue: Record<string, unknown>,
  targetModel: string
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...relValue };

  if ("create" in out) {
    out.create = encryptDataNode(out.create, targetModel);
  }
  if ("createMany" in out && isPlainObject(out.createMany) && "data" in out.createMany) {
    out.createMany = {
      ...out.createMany,
      data: encryptDataNode((out.createMany as Record<string, unknown>).data, targetModel),
    };
  }
  if ("update" in out) {
    out.update = encryptUpdateShape(out.update, targetModel);
  }
  if ("upsert" in out) {
    out.upsert = encryptUpsertShape(out.upsert, targetModel);
  }
  if ("connectOrCreate" in out) {
    out.connectOrCreate = encryptConnectOrCreateShape(out.connectOrCreate, targetModel);
  }

  return out;
}

function encryptUpdateShape(node: unknown, targetModel: string): unknown {
  if (Array.isArray(node)) return node.map((el) => encryptUpdateShape(el, targetModel));
  if (!isPlainObject(node)) return node;
  // update shape is either { where, data } or the data itself directly
  if ("data" in node) {
    return { ...node, data: encryptDataNode(node.data, targetModel) };
  }
  return encryptDataNode(node, targetModel);
}

function encryptUpsertShape(node: unknown, targetModel: string): unknown {
  if (Array.isArray(node)) return node.map((el) => encryptUpsertShape(el, targetModel));
  if (!isPlainObject(node)) return node;
  const out: Record<string, unknown> = { ...node };
  if ("create" in out) out.create = encryptDataNode(out.create, targetModel);
  if ("update" in out) out.update = encryptDataNode(out.update, targetModel);
  return out;
}

function encryptConnectOrCreateShape(node: unknown, targetModel: string): unknown {
  if (Array.isArray(node)) return node.map((el) => encryptConnectOrCreateShape(el, targetModel));
  if (!isPlainObject(node)) return node;
  const out: Record<string, unknown> = { ...node };
  if ("create" in out) out.create = encryptDataNode(out.create, targetModel);
  return out;
}

// Decrypts any encrypted string found anywhere in a query result, however
// deeply nested (relations pulled in via `include`/`select` are just plain
// nested objects/arrays by the time Prisma returns them). decryptValue is a
// no-op passthrough for plaintext, so this is safe to run unconditionally
// on every result without needing to know which model each nested object
// came from.
function decryptResult<T>(node: T): T {
  if (Array.isArray(node)) {
    return node.map((el) => decryptResult(el)) as unknown as T;
  }
  if (typeof node === "string") {
    return (isEncrypted(node) ? decryptValue(node) : node) as unknown as T;
  }
  if (isPlainObject(node)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = decryptResult(v);
    }
    return out as unknown as T;
  }
  return node;
}

const WRITE_OPS = new Set([
  "create",
  "update",
  "upsert",
  "createMany",
  "createManyAndReturn",
  "updateMany",
]);

function encryptionExtension(client: PrismaClient) {
  return client.$extends({
    name: "fieldEncryption",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const a = args as Record<string, unknown>;

          if (WRITE_OPS.has(operation) && model) {
            if ("data" in a) {
              a.data = encryptDataNode(a.data, model);
            }
            if (operation === "upsert") {
              if ("create" in a) a.create = encryptDataNode(a.create, model);
              if ("update" in a) a.update = encryptDataNode(a.update, model);
            }
          }

          const result = await query(args as never);
          return decryptResult(result);
        },
      },
    },
  });
}

// Prevent multiple PrismaClient instances in dev (Next.js hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof encryptionExtension>;
};

export const prisma =
  globalForPrisma.prisma || encryptionExtension(new PrismaClient());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type { Prisma };
