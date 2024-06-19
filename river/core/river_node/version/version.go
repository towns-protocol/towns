package version

var (
	version = "dev_local" // default version
	branch  = ""          // default branch name
	commit  = ""          // default commit hash
)

func GetFullVersion() string {
	ret := version
	if branch != "" {
		ret += "/" + branch
	}
	if commit != "" {
		ret += "/" + commit
	}
	return ret
}

func GetVersion() string {
	return version
}

func GetBranch() string {
	return branch
}

func GetCommit() string {
	return commit
}
