import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomainRouteService } from '../services/domain-route.service';
import { Router } from '@angular/router';
import { PathRoute } from '../model/path-route';
import { delay, takeUntil } from 'rxjs/operators';
import { Types } from '../../domain/model/path-route'
import { Subject } from 'rxjs';

@Component({
  selector: 'app-domain',
  templateUrl: './domain.component.html',
  styleUrls: ['./domain.component.css']
})
export class DomainComponent implements OnInit, OnDestroy {

  selectedDomain: PathRoute;
  selectedGroup: PathRoute;
  selectedConfig: PathRoute;
  currentPathRoute: PathRoute;

  private unsubscribe: Subject<void> = new Subject();

  constructor(
    private domainRouteService: DomainRouteService,
    private router: Router
  ) { }

  ngOnInit() {
    if (!this.currentPathRoute) {
      this.domainRouteService.pathChange.pipe(delay(0), takeUntil(this.unsubscribe)).subscribe(() => {
        this.updateRoute();
      });
    }

    this.updateRoute();
  }

  ngOnDestroy() {
    this.unsubscribe.next();
    this.unsubscribe.complete();
  }

  updateRoute() {
      this.selectedDomain = this.domainRouteService.getPathElement(Types.SELECTED_DOMAIN);
      this.selectedGroup = this.domainRouteService.getPathElement(Types.SELECTED_GROUP);
      this.selectedConfig = this.domainRouteService.getPathElement(Types.SELECTED_CONFIG);
      this.currentPathRoute = this.domainRouteService.getPathElement(Types.CURRENT_ROUTE);
  }

  getLabelListChildren() {
    if (this.currentPathRoute) {
      if (this.currentPathRoute.type === Types.DOMAIN_TYPE) {
        return 'Groups';
      } else if (this.currentPathRoute.type === Types.GROUP_TYPE || 
        this.currentPathRoute.type === Types.CONFIG_TYPE) {
        return 'Switchers';
      }
    }
  }

  gotoListChildren() {
    if (this.currentPathRoute) {
      if (this.currentPathRoute.type === Types.DOMAIN_TYPE) {
        this.router.navigate(['/dashboard/domain/groups']);
      } else if (this.currentPathRoute.type === Types.GROUP_TYPE || 
        this.currentPathRoute.type === Types.CONFIG_TYPE) {
        this.router.navigate(['/dashboard/domain/group/configs']);
      }
    }
  }

  gotoDetails() {
    if (this.currentPathRoute) {
      this.router.navigate([this.currentPathRoute.path], { state: { element: JSON.stringify(this.currentPathRoute.element) } });
    }
  }

  getCurrentRoute(): PathRoute {
    return this.currentPathRoute;
  }

  getDomain(): PathRoute {
    return this.selectedDomain;
  }

  getDomainElement(): string {
    return JSON.stringify(this.selectedDomain.element);
  }

  getGroup(): PathRoute {
    return this.selectedGroup;
  }

  getGroupElement(): string {
    return JSON.stringify(this.selectedGroup.element);
  }

  getConfig(): PathRoute {
    return this.selectedConfig;
  }

  getConfigElement(): string {
    return JSON.stringify(this.selectedConfig.element);
  }

}
