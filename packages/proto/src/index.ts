import { join } from 'path';

// Root directory that stores all shared protobuf definitions.
export const PROTO_ROOT = join(__dirname, '..', 'protos');

// Auth service gRPC contract.
export const AUTH_PROTO_PATH = join(PROTO_ROOT, 'auth.proto');
export const AUTH_PROTO_PACKAGE = 'auth';
export const AUTH_PROTO_SERVICE = 'AuthService';
