/*
 * Copyright © 2020 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** Uppercase first letter of string. */
export function ucFirst(s: string | undefined): string | undefined {
    if (!s) {
        return s;
    }
    return s.substring(0, 1).toUpperCase() + s.substring(1);
}

/** Pad numbers less than ten with leading zero. */
function padNumber(n: number): string {
    return n < 10 ? `0${n}` : `${n}`;
}

/** Return a UTC date string for provided date. */
export function dateString(d: Date): string {
    const y = d.getUTCFullYear();
    const m = padNumber(d.getUTCMonth() + 1);
    const a = padNumber(d.getUTCDate());
    return `${y}${m}${a}`;
}
