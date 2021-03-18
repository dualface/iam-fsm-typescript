/**
 * 状态转换回调
 */
export interface FSMTransitionCallback {
    (instance: FSMInstance, from: string, to: string): void;
}

/**
 * 有限状态机
 */
export class FSMInstance {
    /**
     * 当前状态
     */
    get state(): string {
        return this._state;
    }

    /**
     * 当前状态内部存储
     */
    private _state: string;

    /**
     * 所有可用状态
     */
    private states = new Set<string>();

    /**
     * 所有的转换
     */
    private transitions = new Map<string, FSMTransition>();

    /**
     * from ... to
     */
    private paths = new Map<string, Set<string>>();

    /**
     * 状态切换时的回调
     */
    private listeners = new Map<string, FSMTransitionCallback[]>();

    /**
     * 构造函数
     *
     * @param init 初始状态
     */
    constructor(init: string) {
        this._state = init;
    }

    /**
     * 注册回调函数
     *
     * @param state 状态
     * @param listener 回调函数
     */
    on(state: string, listener: FSMTransitionCallback): FSMInstance {
        const listeners = this.listeners.get(state) ?? [];
        listeners.push(listener);
        this.listeners.set(state, listeners);
        return this;
    }

    /**
     * 注销回调函数
     *
     * @param state 状态转换的名字
     * @param listener 回调函数
     */
    off(state: string, listener?: FSMTransitionCallback): FSMInstance {
        if (listener) {
            const listeners = this.listeners.get(state) ?? [];
            for (let i = 0, l = listeners.length; i < l; i++) {
                if (listeners[i] === listener) {
                    listeners.splice(i, 1);
                    break;
                }
            }
        } else {
            this.listeners.delete(state);
        }
        return this;
    }

    /**
     * 检查是否可以进行指定状态变换操作
     *
     * @param name 状态转换的名字
     */
    can(name: string): boolean {
        const transition = this.transitions.get(name);
        if (!transition) {
            return false;
        }
        if (
            !transition.willcard &&
            transition.sources.indexOf(this._state) === -1
        ) {
            return false;
        }
        return true;
    }

    /**
     * 转换状态
     *
     * @param name 状态转换的名字
     */
    move(name: string): FSMInstance {
        const transition = this.transitions.get(name);
        if (!transition) {
            throw new RangeError(
                `FSMInstance.move(): not found transition '${name}'`
            );
        }
        const { sources, dest } = transition;
        if (!transition.willcard && sources.indexOf(this._state) === -1) {
            throw new RangeError(
                `FSMInstance.move(): current state expected is '${sources}', actual is '${this._state}'`
            );
        }

        const from = this._state;
        this._state = dest;

        const listeners = this.listeners.get(dest);
        if (listeners) {
            listeners.forEach((listener) => listener(this, from, dest));
        }
        return this;
    }

    /**
     * 设置状态转换
     *
     * @param name 状态转换的名字
     * @param sources 来源状态要求
     * @param dest 目标状态
     */
    set(name: string, sources: string[] | string, dest: string): FSMInstance {
        if (this.transitions.has(name)) {
            throw new RangeError(
                `FSMInstance.set(): transition '${name}' already exists`
            );
        }
        if (!Array.isArray(sources)) {
            sources = [sources];
        }
        const transition = new FSMTransition(name, sources, dest);
        this.transitions.set(name, transition);
        this.states.add(dest);
        sources.forEach((source) => {
            this.states.add(source);
            let path = this.paths.get(source);
            if (!path) {
                path = new Set<string>();
                this.paths.set(source, path);
            }
            path.add(dest);
        });

        return this;
    }
}

//// private

class FSMTransition {
    readonly willcard: boolean = false;

    constructor(
        readonly name: string,
        readonly sources: string[],
        readonly dest: string
    ) {
        if (sources.indexOf("*") !== -1) {
            this.willcard = true;
            this.sources = ["*"];
        }
    }
}
