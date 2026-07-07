import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button, Card, CardBody } from "./ui";

interface State { hasError: boolean; error?: Error; }

/**
 * Component-level error boundary — prevents blank screens when a page
 * throws during render (e.g. corrupted data). Shows a friendly message
 * with a retry option and logs the error to the console.
 */
export class ErrorBoundary extends Component<{ children: ReactNode; label?: string }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Render error:", error, info);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-xl mx-auto py-10">
          <Card>
            <CardBody className="text-center">
              <div className="text-5xl mb-3">⚠️</div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Something went wrong while displaying this content.
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {this.props.label ? `Section: ${this.props.label}. ` : ""}
                Please try again or return to the previous page.
              </p>
              {this.state.error && (
                <pre className="text-start mt-3 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 p-2 rounded overflow-auto max-h-40">
                  {this.state.error.message}
                </pre>
              )}
              <div className="mt-4 flex gap-2 justify-center">
                <Button onClick={this.reset}>Try again</Button>
                <Button variant="outline" onClick={() => window.history.back()}>Go back</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
