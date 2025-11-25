export type AmlDecision = 'PASSED' | 'REVIEW' | 'FAILED' | 'PENDING' | 'ERROR';

export interface AmlPartyInfo {
    userId: string;
    address: string;
    // KYC fields we expect to get from auth service; keep optional for now
    fullName?: string;
    documentId?: string;
    nationality?: string;
    dateOfBirth?: string; // ISO date
}

export interface AmlScanRequestPayload {
    correlationId: string; // our generated id
    from: AmlPartyInfo;
    to: AmlPartyInfo;
    amount: string;
    tokenAddress?: string;
    // additional fields as required by WSDL
    [key: string]: any;
}

export interface AmlScanResponsePayload {
    decision: AmlDecision;
    resultCode?: string;
    correlationId?: string; // theirs, if returned
    raw?: any;
}
