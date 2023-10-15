import { PrivateKey } from "./index";
export interface WorkerAPI {
    executeOffline: (localProgram: string, aleoFunction: string, inputs: string[], privateKey: string) => Promise<{
        outputs: any;
        execution: string;
    } | string>;
    getPrivateKey: () => Promise<PrivateKey>;
}
