## Usage

```hcl
module "loadtest" {
    source          = "../../modules/loadtest"
    vpc_id          = module.vpc.vpc_id
    public_subnets  = module.vpc.public_subnets
    private_subnets = module.vpc.private_subnets
    num_followers   = 2
    ecs_cluster = {
        id   = aws_ecs_cluster.river_ecs_cluster.id
        name = aws_ecs_cluster.river_ecs_cluster.name
    }
}
```
