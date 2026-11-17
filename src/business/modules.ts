export interface BusinessModule {
  path: string;
  name: string;
  component: string;
  permission: string;
}
export const businessModules: BusinessModule[] = [
  {
    path: '/requests',
    name: 'requests',
    component: './Requests',
    permission: 'purchase:request:list',
  },
];
