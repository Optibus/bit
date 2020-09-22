import { compact } from 'lodash';
import { runCLI } from 'jest';
import { Tester, TesterContext, Tests, TestResult, TestsResult, TestsFiles } from '@teambit/tester';
import { TestResult as JestTestResult, AggregatedResult } from '@jest/test-result';
import { formatResultsErrors } from 'jest-message-util';
import { ComponentMap, ComponentID } from '@teambit/component';
import { AbstractVinyl } from 'bit-bin/dist/consumer/component/sources';

export class JestTester implements Tester {
  constructor(readonly jestConfig: any) {}

  private getTestFile(path: string, testerContext: TesterContext): AbstractVinyl | undefined {
    return testerContext.specFiles.toArray().reduce((acc: AbstractVinyl | undefined, [, specs]) => {
      const file = specs.find((spec) => spec.path === path);
      if (file) acc = file;
      return acc;
    }, undefined);
  }

  private attachTestsToComponent(testerContext: TesterContext, testResult: JestTestResult[]) {
    return ComponentMap.as(testerContext.components, (component) => {
      const componentSpecFiles = testerContext.specFiles.get(component);
      if (!componentSpecFiles) return undefined;
      const [, specs] = componentSpecFiles;
      return testResult.filter((test) => {
        return specs.filter((spec) => spec.path === test.testFilePath).length > 0;
      });
    });
  }

  private buildTestsObj(
    aggregatedResult: AggregatedResult,
    components: ComponentMap<JestTestResult[] | undefined>,
    testerContext: TesterContext,
    config?: any
  ) {
    const tests = components.toArray().map(([component, testsFiles]) => {
      if (!testsFiles) return;
      if (testsFiles?.length === 0) return;
      const suiteErrors = testsFiles.reduce((errors: { failureMessage: string; file: string }[], test) => {
        const file = this.getTestFile(test.testFilePath, testerContext);
        if (test.testExecError)
          errors.push({
            failureMessage: test.testExecError.message,
            file: file?.relative || test.testFilePath,
          });
        return errors;
      }, []);

      const tests = testsFiles.map((test) => {
        const file = this.getTestFile(test.testFilePath, testerContext);
        const tests = test.testResults.map((testResult) => {
          const error = formatResultsErrors([testResult], config, { noStackTrace: false });
          return new TestResult(
            testResult.ancestorTitles,
            testResult.title,
            testResult.status,
            testResult.duration,
            error || undefined
          );
        });
        const filePath = file?.relative || test.testFilePath;
        const error = { failureMessage: test.failureMessage, error: test.testExecError?.message };
        return new TestsFiles(
          filePath,
          tests,
          test.numPassingTests,
          test.numFailingTests,
          test.numPendingTests,
          test.perfStats.runtime,
          test.perfStats.slow,
          error
        );
      });

      return {
        componentId: component.id,
        results: new TestsResultList(tests, aggregatedResult.success, aggregatedResult.startTime),
      };
    });

    return compact(tests) as { componentId: ComponentID; results: TestsResult }[];
  }

  private getErrors(testResult: JestTestResult[]) {
    return testResult.reduce((errors: any[], test) => {
      errors.push(test.testExecError);
      return errors;
    }, []);
  }

  async test(context: TesterContext): Promise<Tests> {
    const config: any = {
      rootDir: context.rootPath,
      watch: context.watch,
      // runInBand: context.debug,
    };
    // eslint-disable-next-line
    const jestConfig = require(this.jestConfig);
    const testFiles = context.specFiles.toArray().reduce((acc: string[], [, specs]) => {
      specs.forEach((spec) => acc.push(spec.path));
      return acc;
    }, []);

    const jestConfigWithSpecs = Object.assign(jestConfig, {
      testMatch: testFiles,
    });

    const withEnv = Object.assign(jestConfigWithSpecs, config);
    const testsOutPut = await runCLI(withEnv, [this.jestConfig]);
    const testResults = testsOutPut.results.testResults;
    const componentsWithTests = this.attachTestsToComponent(context, testResults);
    const componentTestResults = this.buildTestsObj(
      testsOutPut.results,
      componentsWithTests,
      context,
      jestConfigWithSpecs
    );
    const globalErrors = this.getErrors(testResults);
    return { components: componentTestResults, errors: globalErrors };
  }
}
