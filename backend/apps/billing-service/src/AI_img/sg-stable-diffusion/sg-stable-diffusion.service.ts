import { Injectable } from '@nestjs/common';
import {
    SageMakerRuntimeClient,
    InvokeEndpointCommand,
    InvokeEndpointCommandInput,
  } from '@aws-sdk/client-sagemaker-runtime';
import { SgStableDiffusionRequestDTO } from './model/sg-stable-diffusion-request.dto';
import { getUniqueFilePath, persistData } from '../utils/file.utils';

const ENDPOINT_NAME = 'jumpstart-dft-stable-diffusion-v2-1-base-v4';

interface OutputResult {
    generated_images: string[];
    prompt: string;
}

@Injectable()
export class SgStableDiffusionService {
    private readonly sageMakerRuntime:SageMakerRuntimeClient

    constructor(){
        this.sageMakerRuntime = new SageMakerRuntimeClient({region:"us-east-1"})
    }

    async generateImage(data:SgStableDiffusionRequestDTO){

        const input:InvokeEndpointCommandInput = {
            EndpointName: ENDPOINT_NAME,
            Body: JSON.stringify(data),
            ContentType: "application/json",
            Accept: "application/json",
        }

        const command = new InvokeEndpointCommand(input)
        const response = await this.sageMakerRuntime.send(command)

        const responseBody: any = response.Body as any
        const bodyBuffer = Buffer.isBuffer(responseBody)
            ? responseBody
            : Buffer.from(responseBody as Uint8Array)
        const parsedBody = JSON.parse(bodyBuffer.toString("utf-8")) as OutputResult

        const outputFilePath = getUniqueFilePath(".jpeg")

        const imageBuffer = Buffer.from(parsedBody.generated_images[0],'base64')
        persistData(imageBuffer,outputFilePath)

        return outputFilePath
    }
}
