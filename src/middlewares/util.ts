import { ErrorObject } from 'ajv';
import { OpenApiRequest, ValidationErrorItem } from '../framework/types';

export class ContentType {
  public readonly contentType: string = null;
  public readonly mediaType: string = null;
  public readonly charSet: string = null;
  public readonly withoutBoundary: string = null;
  public readonly isWildCard: boolean;
  private constructor(contentType: string | null) {
    this.contentType = contentType;
    if (contentType) {
      this.withoutBoundary = contentType.replace(/;\s{0,}boundary.*/, '').toLowerCase();
      this.mediaType = this.withoutBoundary.split(';')[0].toLowerCase().trim();
      this.charSet = this.withoutBoundary.split(';')[1]?.toLowerCase();
      this.isWildCard = RegExp(/^[a-z]+\/\*$/).test(this.contentType);
      if (this.charSet) {
        this.charSet = this.charSet.toLowerCase().trim();
      }
    }
  }
  public static fromString(contentType: string): ContentType {
    return new ContentType(contentType);
  }

  public static from(req: OpenApiRequest): ContentType {
    return new ContentType(req.headers?.['content-type']);
  }

  public equivalents(): string[] {
    if (!this.withoutBoundary) {return [];}
    if (this.charSet) {
      return [this.mediaType, `${this.mediaType}; ${this.charSet}`];
    }
    return [this.withoutBoundary, `${this.mediaType}; charset=utf-8`];
  }
}

/**
 * (side-effecting) modifies the errors object
 * TODO - do this some other way
 * @param errors
 */
export function augmentAjvErrors(
  errors: ErrorObject[] = []
): ErrorObject[] {
  errors.forEach(e => {
    if (e.keyword === 'enum') {
      const params: any = e.params;
      const allowedEnumValues = params?.allowedValues;
      e.message = allowedEnumValues
        ? `${e.message}: ${allowedEnumValues.join(', ')}`
        : e.message;
    }
  });
  return errors;
}
export function ajvErrorsToValidatorError(errors: ErrorObject[]): ValidationErrorItem[] {
  return errors.map(e => {
    const params: any = e.params;
    const required = params?.missingProperty && `${e.instancePath}.${params.missingProperty}`;
    const additionalProperty = params?.additionalProperty && `${e.instancePath}.${params.additionalProperty}`;
    const path = required ?? additionalProperty ?? e.instancePath ?? e.schemaPath;
    const originalPath = e.instancePath ?? e.schemaPath;

    let fullMessage = `request${path} ${e.message}`;
    if (additionalProperty) {
      fullMessage = `request${originalPath} must NOT have additional property: '${params.additionalProperty}'`;
    } else if (required) {
      fullMessage = `missing required property request${path}`;
    }
    return {
      path,
      message: e.message,
      fullMessage
    };
  });
}
