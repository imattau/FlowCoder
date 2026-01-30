#!/usr/bin/env node
import { createCli } from "./cli.ts";

const program = createCli();
program.parse(process.argv);