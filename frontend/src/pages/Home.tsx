import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api';
import { Card, CardContent, Badge, Skeleton } from '../components/ui';
import { cn } from '../lib/utils';
import { API, ROUTES, COPY, DEFAULTS, DIFFICULTY_VARIANT, DIFFICULTY_COLOR } from '../config';

interface Problem {
  id: number;
  title: string;
  description: string;
  difficulty: string;
  skill_tags: string[];
}

function ProblemCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </Card>
  );
}

export default function Home() {
  const { data: problems, isLoading } = useQuery<Problem[]>({
    queryKey: ['problems'],
    queryFn: async () => {
      const res = await api.get(API.ENDPOINTS.PROBLEMS);
      return res.data;
    },
  });

  return (
    <div className="py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{COPY.HOME.TITLE}</h1>
        <p className="text-muted-foreground mt-1">{COPY.HOME.SUBTITLE}</p>
      </div>

      <div className="grid gap-3">
        {isLoading
          ? Array.from({ length: DEFAULTS.SKELETON_COUNT }).map((_, i) => (
              <ProblemCardSkeleton key={i} />
            ))
          : problems?.map((problem) => (
              <Link key={problem.id} to={ROUTES.problemDetail(problem.id)} className="block group">
                <Card className="p-5 transition-all hover:border-primary/30 hover:shadow-md">
                  <CardContent className="p-0">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">
                          {problem.title}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {problem.skill_tags.map((tag) => (
                            <Badge key={tag} variant="outline" className="font-normal">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Badge
                        variant={DIFFICULTY_VARIANT[problem.difficulty] ?? 'secondary'}
                        className={cn(
                          'bg-opacity-15 border-transparent',
                          DIFFICULTY_COLOR[problem.difficulty],
                        )}
                      >
                        {problem.difficulty}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
        {problems?.length === 0 && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">{COPY.HOME.EMPTY}</p>
          </div>
        )}
      </div>
    </div>
  );
}
