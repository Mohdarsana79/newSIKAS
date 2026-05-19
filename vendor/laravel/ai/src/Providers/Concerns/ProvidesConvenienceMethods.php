<?php

namespace Laravel\Ai\Providers\Concerns;

use Illuminate\Broadcasting\Channel;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Prompts\AgentPrompt;
use Laravel\Ai\Responses\AgentResponse;
use Laravel\Ai\Responses\QueuedAgentResponse;
use Laravel\Ai\Responses\StreamableAgentResponse;
use Stringable;

/**
 * Provides convenience methods for simple text generation without requiring an Agent instance.
 */
trait ProvidesConvenienceMethods
{
    /**
     * Generate text from a simple prompt string.
     *
     * @param string $prompt The prompt to send
     * @param array $options Generation options (temperature, max_tokens, etc.)
     * @param ?string $model The model to use (defaults to provider's default)
     * @param ?int $timeout Request timeout in seconds
     * @return string The generated text response
     */
    public function generateText(
        string $prompt,
        array $options = [],
        ?string $model = null,
        ?int $timeout = null
    ): string {
        // Create a simple inline agent for text generation
        $agent = new class($options) implements Agent {
            public function __construct(protected array $options) {}
            public function instructions(): Stringable|string {
                return '';
            }

            public function maxTokens(): ?int {
                return $this->options['max_tokens'] ?? $this->options['maxTokens'] ?? null;
            }

            public function temperature(): ?float {
                return $this->options['temperature'] ?? null;
            }

            public function prompt(
                string $prompt,
                array $attachments = [],
                Lab|array|string|null $provider = null,
                ?string $model = null,
                ?int $timeout = null,
            ): AgentResponse {
                throw new \RuntimeException('Method not implemented on simple text generation agent');
            }

            public function stream(
                string $prompt,
                array $attachments = [],
                Lab|array|string|null $provider = null,
                ?string $model = null,
                ?int $timeout = null,
            ): StreamableAgentResponse {
                throw new \RuntimeException('Method not implemented on simple text generation agent');
            }

            public function queue(
                string $prompt,
                array $attachments = [],
                Lab|array|string|null $provider = null,
                ?string $model = null
            ): QueuedAgentResponse {
                throw new \RuntimeException('Method not implemented on simple text generation agent');
            }

            public function broadcast(
                string $prompt,
                Channel|array $channels,
                array $attachments = [],
                bool $now = false,
                Lab|array|string|null $provider = null,
                ?string $model = null
            ): StreamableAgentResponse {
                throw new \RuntimeException('Method not implemented on simple text generation agent');
            }

            public function broadcastNow(
                string $prompt,
                Channel|array $channels,
                array $attachments = [],
                Lab|array|string|null $provider = null,
                ?string $model = null
            ): StreamableAgentResponse {
                throw new \RuntimeException('Method not implemented on simple text generation agent');
            }

            public function broadcastOnQueue(
                string $prompt,
                Channel|array $channels,
                array $attachments = [],
                Lab|array|string|null $provider = null,
                ?string $model = null
            ): QueuedAgentResponse {
                throw new \RuntimeException('Method not implemented on simple text generation agent');
            }
        };

        // Create an AgentPrompt
        $agentPrompt = new AgentPrompt(
            agent: $agent,
            prompt: $prompt,
            attachments: [],
            provider: $this,
            model: $model ?? $this->defaultTextModel(),
            timeout: $timeout
        );

        // Call prompt and return just the text
        return $this->prompt($agentPrompt)->text;
    }

    /**
     * Stream text generation from an agent with optional configuration.
     *
     * @param Agent $agent The agent to invoke
     * @param array $options Generation options (temperature, max_tokens, etc.)
     * @param ?string $model The model to use (defaults to provider's default)
     * @param ?int $timeout Request timeout in seconds
     * @return StreamableAgentResponse The streamable response
     */
    public function streamText(
        Agent $agent,
        array $options = [],
        ?string $model = null,
        ?int $timeout = null
    ): StreamableAgentResponse {
        $model = $model ?? $this->defaultTextModel();

        // Create an AgentPrompt with an empty prompt
        // For conversational agents, they use their own conversation history
        $agentPrompt = new AgentPrompt(
            agent: $agent,
            prompt: '',
            attachments: [],
            provider: $this,
            model: $model,
            timeout: $timeout ?? 60
        );

        // Return the stream response
        return $this->stream($agentPrompt);
    }
}


